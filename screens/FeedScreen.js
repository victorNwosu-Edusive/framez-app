import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image, RefreshControl } from 'react-native';
import { supabase } from '../config/supabase';
import PostItem from '../components/PostItem';

export default function FeedScreen({ navigation, parentNavigation }) {
  const [posts, setPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching posts:', error);
    } else {
      setPosts(data);
    }
  };

  useEffect(() => {
    fetchPosts();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('posts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload) => {
        console.log('FeedScreen post change:', payload);
        fetchPosts(); // Refetch posts on any change
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDeletePost = (postId) => {
    setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postId));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
        source={require('../assets/images/framez-logo.png')} // put your image in assets folder
        style={styles.logo}
        resizeMode="contain"
        />
        <Text style={styles.title}>Feed</Text>
      </View>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostItem post={item} navigation={parentNavigation} onDeletePost={handleDeletePost} />}
        ListEmptyComponent={<Text style={styles.empty}>No posts yet. Be the first to share!</Text>}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 30,
  },

  title: {
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
    padding:3,
    paddingInline:14,
    backgroundColor:'#f1f1f1',
    borderRadius:10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  logo: {
    width:80,
  },

  empty: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Inter_400Regular',
  },
});
