import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Modal, Dimensions, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';

const { width, height } = Dimensions.get('window');

export default function PostItem({ post, navigation, onDeletePost }) {
  const { currentUser } = useAuth();
  const { showActionSheetWithOptions } = useActionSheet();
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    let commentChannel;
    let likeChannel;

    // Fetch comment count for this post
    const fetchCommentCount = async () => {
      const { count, error } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      if (!error) {
        setCommentCount(count);
      }
    };

    // Fetch like count and user's like status
    const fetchLikeData = async () => {
      // Get like count
      const { count, error: countError } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', post.id);
      if (!countError) {
        setLikeCount(count);
      }

      // Check if current user liked this post
      if (currentUser?.uid) {
        const { data, error: likeError } = await supabase
          .from('likes')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', currentUser.uid)
          .single();
        if (!likeError && data) {
          setIsLiked(true);
        } else {
          setIsLiked(false);
        }
      }
    };

    fetchCommentCount();
    fetchLikeData();

    // Subscribe to comment changes for this post
    commentChannel = supabase
      .channel(`comments_count_${post.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (payload) => {
        console.log('Comment change detected:', payload);
        if (payload.new?.post_id === post.id || payload.old?.post_id === post.id) {
          console.log('Comment change for this post, updating count');
          fetchCommentCount();
        }
      })
      .subscribe();

    // Subscribe to like changes for this post
    likeChannel = supabase
      .channel(`likes_count_${post.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, async (payload) => {
        console.log('Like change detected:', payload);
        if (payload.new?.post_id === post.id || payload.old?.post_id === post.id) {
          console.log('Like change for this post, updating data');

          // Immediately refetch like data to ensure accuracy
          const { count, error: countError } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);
          if (!countError) {
            setLikeCount(count);
          }

          // Check if current user liked this post
          if (currentUser?.uid) {
            const { data, error: likeError } = await supabase
              .from('likes')
              .select('id')
              .eq('post_id', post.id)
              .eq('user_id', currentUser.uid)
              .single();
            setIsLiked(!likeError && !!data);
          }
        }
      })
      .subscribe();

    return () => {
      if (commentChannel) {
        supabase.removeChannel(commentChannel);
      }
      if (likeChannel) {
        supabase.removeChannel(likeChannel);
      }
    };
  }, [post.id, currentUser?.uid]);

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const handlePostPress = () => {
    navigation.navigate('PostDetail', { post });
  };

  const handleImagePress = () => {
    setImageModalVisible(true);
  };

  const handleMenuPress = () => {
    const isOwner = currentUser && currentUser.uid === post.author_id;
    console.log('PostItem handleMenuPress:', { isOwner, currentUserUid: currentUser?.uid, postAuthorId: post.author_id });
    const options = [];
    const destructiveButtonIndex = [];
    const cancelButtonIndex = [];

    if (isOwner) {
      options.push('Delete Post');
      destructiveButtonIndex.push(0);
    }

    options.push('Share this post');
    cancelButtonIndex.push(options.length - 1);

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        destructiveButtonIndex,
      },
      (buttonIndex) => {
        if (isOwner && buttonIndex === 0) {
          // Delete Post
          Alert.alert(
            'Delete Post',
            'Are you sure you want to delete this post?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  console.log('Deleting post:', post.id);
                  try {
                    const { error } = await supabase
                      .from('posts')
                      .delete()
                      .eq('id', post.id);
                    if (error) {
                      console.error('Delete error:', error);
                      throw error;
                    }
                    console.log('Post deleted successfully');
                    // Force refresh by calling fetchPosts
                    if (onDeletePost) {
                      onDeletePost(post.id);
                    }
                  } catch (err) {
                    console.error('Failed to delete post:', err);
                    Alert.alert('Error', 'Failed to delete post');
                  }
                },
              },
            ]
          );
        } else if (buttonIndex === (isOwner ? 1 : 0)) {
          // Share
          Alert.alert('Share', 'Post content copied to clipboard');
        }
      }
    );
  };

  const handleLikePress = async () => {
    if (!currentUser?.uid) return;

    // Optimistically update UI immediately
    const wasLiked = isLiked;
    const previousCount = likeCount;

    setIsLiked(!wasLiked);
    setLikeCount(wasLiked ? Math.max(0, likeCount - 1) : likeCount + 1);

    try {
      // Try to insert like (will fail if already exists)
      const { error: insertError } = await supabase
        .from('likes')
        .insert({
          post_id: post.id,
          user_id: currentUser.uid,
        });

      if (insertError) {
        if (insertError.code === '23505') { // Unique constraint violation
          // Like already exists, so delete it
          const { error: deleteError } = await supabase
            .from('likes')
            .delete()
            .eq('post_id', post.id)
            .eq('user_id', currentUser.uid);
          if (deleteError) throw deleteError;
        } else {
          throw insertError;
        }
      } else {
        // Like was added successfully, create notification if not self-like
        if (post.author_id !== currentUser.uid) {
          await supabase
            .from('notifications')
            .insert({
              user_id: post.author_id,
              actor_id: currentUser.uid,
              actor_name: currentUser.username || 'Anonymous',
              post_id: post.id,
              type: 'like',
              message: `${currentUser.username || 'Someone'} liked your post`,
            });
        }
      }
      // If insert succeeded, the like was added
    } catch (error) {
      console.error('Error toggling like:', error);
      Alert.alert('Error', 'Failed to update like');
      // Revert optimistic update on error
      setIsLiked(wasLiked);
      setLikeCount(previousCount);
    }
  };

  const handleAuthorPress = () => {
    if (post.author_id && post.author_id !== currentUser?.uid) {
      navigation.navigate('Profile', { userId: post.author_id });
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePostPress}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleAuthorPress}>
          <Text style={styles.author}>{post.author_name || 'Anonymous'}</Text>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <Text style={styles.timestamp}>{formatDate(post.created_at)}</Text>
          <TouchableOpacity onPress={handleMenuPress} style={styles.menuButton}>
            <Ionicons name="ellipsis-vertical" size={18} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.content}>{post.content}</Text>
      {post.image_url && (
        <TouchableOpacity onPress={handleImagePress}>
          <Image source={{ uri: post.image_url }} style={styles.image} />
        </TouchableOpacity>
      )}

      <View style={styles.footer}>
        <TouchableOpacity onPress={handleLikePress} style={styles.actionButton}>
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={20}
            color={isLiked ? "#FF3B30" : "#666"}
          />
          {likeCount > 0 && <Text style={[styles.actionCount, isLiked && styles.likedCount]}>{likeCount}</Text>}
        </TouchableOpacity>

        {commentCount > 0 && (
          <View style={styles.actionButton}>
            <Ionicons name="chatbubble-outline" size={16} color="#666" />
            <Text style={styles.commentCount}>{commentCount}</Text>
          </View>
        )}
      </View>

      <Modal
        visible={imageModalVisible}
        transparent={true}
        onRequestClose={() => setImageModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalClose}
            onPress={() => setImageModalVisible(false)}
          >
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          <Image source={{ uri: post.image_url }} style={styles.fullImage} />
        </View>
      </Modal>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    marginLeft: 10,
  },
  author: {
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Inter_400Regular',
  },
  content: {
    fontSize: 17,
    marginBottom: 10,
    fontFamily: 'Inter_400Regular',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionCount: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Inter_400Regular',
  },
  likedCount: {
    color: '#FF3B30',
  },
  commentCount: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Inter_400Regular',
  },
  fullImage: {
    width: width,
    height: height * 0.8,
    resizeMode: 'contain',
  },
});
