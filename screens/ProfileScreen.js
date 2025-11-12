import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import PostItem from '../components/PostItem';

export default function ProfileScreen({ navigation, route }) {
  const { currentUser, logout, refreshUserData } = useAuth();
  const { theme } = useTheme();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileUser, setProfileUser] = useState(null);
  const [avatarKey, setAvatarKey] = useState(0);
  const userId = route?.params?.userId;
  const isOwnProfile = !userId || userId === currentUser?.uid;

  const fetchUserData = async () => {
    if (isOwnProfile) {
      setProfileUser(currentUser);
    } else {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId);
        if (error) {
          console.error('Error fetching user:', error);
          Alert.alert('Error', 'User not found');
          navigation.goBack();
          return;
        }
        if (data && data.length > 0) {
          setProfileUser(data[0]);
        } else {
          console.log('No user data found for userId:', userId);
          // Try to get user info from posts if user doesn't exist in users table
          const { data: postData, error: postError } = await supabase
            .from('posts')
            .select('author_name, author_avatar')
            .eq('author_id', userId)
            .limit(1);
          if (!postError && postData && postData.length > 0) {
            setProfileUser({
              id: userId,
              username: postData[0].author_name,
              avatar_url: postData[0].author_avatar,
              email: null
            });
          } else {
            console.log('No posts found for userId:', userId);
            // Try to get user info from comments if no posts exist
            const { data: commentData, error: commentError } = await supabase
              .from('comments')
              .select('author_name, user_avatar')
              .eq('user_id', userId)
              .limit(1);
            if (!commentError && commentData && commentData.length > 0) {
              setProfileUser({
                id: userId,
                username: commentData[0].author_name,
                avatar_url: commentData[0].user_avatar,
                email: null
              });
            } else {
              Alert.alert('Error', 'User not found');
              navigation.goBack();
            }
          }
        }
      } catch (err) {
        console.error('Error in fetchUserData:', err);
        Alert.alert('Error', 'Failed to load user profile');
        navigation.goBack();
      }
    }
  };

  const fetchPosts = async () => {
    const targetUserId = isOwnProfile ? currentUser.uid : userId;
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('author_id', targetUserId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching posts:', error);
    } else {
      setPosts(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!currentUser) return;

    fetchUserData();
    fetchPosts();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('user_posts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload) => {
        console.log('ProfileScreen post change:', payload);
        fetchPosts(); // Refetch posts on any change
      })
      .subscribe();

    // Subscribe to comment changes to update comment counts
    const commentChannel = supabase
      .channel('profile_comments_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload) => {
        console.log('ProfileScreen comment change:', payload);
        fetchPosts(); // Refetch posts to update comment counts
      })
      .subscribe();

    // Subscribe to like changes to update like counts
    const likeChannel = supabase
      .channel('profile_likes_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, (payload) => {
        console.log('ProfileScreen like change:', payload);
        fetchPosts(); // Refetch posts to update like counts
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(commentChannel);
      supabase.removeChannel(likeChannel);
    };
  }, [currentUser, userId, isOwnProfile]);

  // Update profileUser when currentUser changes (for own profile)
  useEffect(() => {
    if (isOwnProfile && currentUser) {
      setProfileUser(currentUser);
    }
  }, [currentUser, isOwnProfile]);

  const handleDeletePost = (postId) => {
    setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId));
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error(error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    await fetchPosts();
    setRefreshing(false);
  };

  const pickImage = async () => {
    if (!currentUser?.uid) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      uploadProfileImage(uri);
    }
  };

  const uploadProfileImage = async (uri) => {
    try {
      const response = await fetch(uri);
      const file = await response.arrayBuffer();
      const filename = `avatar-${currentUser.uid}.jpg`;

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filename, file, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      

      if (error) throw error;

      const { data: publicUrl } = supabase.storage
        .from('avatars')
        .getPublicUrl(filename);

      // Update user table
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl.publicUrl })
        .eq('id', currentUser.uid);

      if (updateError) throw updateError;

      // Update local state immediately and refresh user data
      setProfileUser(prev => ({ ...prev, avatar_url: publicUrl.publicUrl }));
      await refreshUserData();
      setAvatarKey(prev => prev + 1);
    } catch (error) {
      Alert.alert('Error', 'Failed to upload image');
      console.error(error);
    }

    
  };

  const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 50 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1 },
    title: { fontSize: 24, fontWeight: 'bold', fontFamily: 'Inter_700Bold' },
    logoutButton: { color: '#ffffff', backgroundColor:'#FF3B30', padding:5, paddingInline:9, borderRadius:5,  fontSize: 13, fontFamily: 'Inter_600SemiBold' },
    userInfo: { alignItems: 'center', padding: 20, borderBottomWidth: 1 },
    avatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
    placeholderAvatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    name: { fontSize: 20, fontWeight: 'bold', fontFamily: 'Inter_700Bold' },
    email: { fontSize: 16, fontFamily: 'Inter_400Regular' },
    postsCount: { fontSize: 14, marginTop: 5, fontFamily: 'Inter_400Regular' },
    empty: { textAlign: 'center', marginTop: 50, fontSize: 16, fontFamily: 'Inter_400Regular' },
    backButton: { position: 'absolute', left: 15, top: 15 },
  });

  const themedStyles = StyleSheet.create({
    container: { backgroundColor: theme.colors.background },
    header: { borderBottomColor: theme.colors.border },
    title: { color: theme.colors.text },
    userInfo: { borderBottomColor: theme.colors.border },
    name: { color: theme.colors.text },
    email: { color: theme.colors.textSecondary },
    postsCount: { color: theme.colors.textSecondary },
    empty: { color: theme.colors.textSecondary },
  });

  return (
    <View style={[styles.container, themedStyles.container]}>
      {/* Header */}
      <View style={[styles.header, themedStyles.header]}>
        {!isOwnProfile && (
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        )}
        <Text style={[styles.title, themedStyles.title]}>Profile</Text>
        {isOwnProfile && (
          <TouchableOpacity onPress={handleLogout}>
            <Text style={styles.logoutButton}>Logout</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* User Info */}
      <View style={[styles.userInfo, themedStyles.userInfo]}>
        {isOwnProfile ? (
          <TouchableOpacity onPress={pickImage}>
            {profileUser?.avatar_url ? (
              <Image source={{ uri: `${profileUser.avatar_url}?key=${avatarKey}` }} style={styles.avatar} onError={() => setProfileUser(prev => ({ ...prev, avatar_url: null }))} />
            ) : (
              <View style={styles.placeholderAvatar}>
                <Text style={{ color: '#fff', fontSize: 32 }}>
                  {profileUser?.username ? profileUser.username[0].toUpperCase() : 'U'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          profileUser?.avatar_url ? (
            <Image source={{ uri: profileUser.avatar_url }} style={styles.avatar} onError={() => setProfileUser(prev => ({ ...prev, avatar_url: null }))} />
          ) : (
            <View style={styles.placeholderAvatar}>
              <Text style={{ color: '#fff', fontSize: 32 }}>
                {profileUser?.username ? profileUser.username[0].toUpperCase() : 'U'}
              </Text>
            </View>
          )
        )}

        <Text style={[styles.name, themedStyles.name]}>
          {profileUser?.username || 'Loading...'}
        </Text>
        {isOwnProfile && <Text style={[styles.email, themedStyles.email]}>{profileUser?.email}</Text>}
        <Text style={[styles.postsCount, themedStyles.postsCount]}>{posts.length} posts</Text>
      </View>

      {/* Posts */}
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostItem post={item} navigation={navigation} onDeletePost={handleDeletePost} />}
          ListEmptyComponent={
            <Text style={[styles.empty, themedStyles.empty]}>No posts yet. Create your first post!</Text>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}
