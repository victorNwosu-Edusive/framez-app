import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Modal, Dimensions, Alert, FlatList, TextInput, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import CommentItem from '../components/CommentItem';

const { width, height } = Dimensions.get('window');

export default function PostDetailScreen({ route, navigation }) {
  const { post } = route.params;
  const { currentUser } = useAuth();
  const { showActionSheetWithOptions } = useActionSheet();
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleAuthorPress = () => {
    if (post.author_id && post.author_id !== currentUser?.uid) {
      navigation.navigate('Profile', { userId: post.author_id });
    }
  };

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });
    if (error) {
      console.error('Error fetching comments:', error);
    } else {
      setComments(data);
    }
    setLoadingComments(false);
  };

  useEffect(() => {
    fetchComments();

    // Subscribe to real-time changes for comments
    const channel = supabase
      .channel('comments_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${post.id}` }, (payload) => {
        console.log('Comment change:', payload);
        fetchComments(); // Refetch comments on any change
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [post.id]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !currentUser) return;

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          user_id: currentUser.uid,
          author_name: currentUser.username || 'Anonymous',
          content: newComment.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      // Create notification if not self-comment
      if (post.author_id !== currentUser.uid) {
        await supabase
          .from('notifications')
          .insert({
            user_id: post.author_id,
            actor_id: currentUser.uid,
            actor_name: currentUser.username || 'Anonymous',
            post_id: post.id,
            type: 'comment',
            message: `${currentUser.username || 'Someone'} commented on your post`,
          });
      }

      setNewComment('');
      // Real-time subscription will update the UI
    } catch (err) {
      console.error('Error adding comment:', err);
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  const handleDeleteComment = (commentId) => {
    setComments((prevComments) => prevComments.filter((comment) => comment.id !== commentId));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchComments();
    setRefreshing(false);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const handleImagePress = () => {
    setImageModalVisible(true);
  };

  const handleMenuPress = () => {
    const isOwner = currentUser && currentUser.uid === post.author_id;
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
                  try {
                    const { error } = await supabase
                      .from('posts')
                      .delete()
                      .eq('id', post.id);
                    if (error) throw error;
                    navigation.goBack();
                  } catch (err) {
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleMenuPress}>
            <Ionicons name="ellipsis-vertical" size={20} color="#000" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CommentItem comment={item} onDeleteComment={handleDeleteComment} navigation={navigation} />}
          ListHeaderComponent={
            <>
              <View style={styles.postContainer}>
                <View style={styles.postHeader}>
                  <TouchableOpacity onPress={handleAuthorPress}>
                    <Text style={styles.author}>{post.author_name || 'Anonymous'}</Text>
                  </TouchableOpacity>
                  <Text style={styles.timestamp}>{formatDate(post.created_at)}</Text>
                </View>
                <Text style={styles.content}>{post.content}</Text>
                {post.image_url && (
                  <TouchableOpacity onPress={handleImagePress}>
                    <Image source={{ uri: post.image_url }} style={styles.image} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.commentsHeader}>
                <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>
              </View>
            </>
          }
          ListEmptyComponent={
            !loadingComments && (
              <Text style={styles.emptyComments}>No comments yet. Be the first to comment!</Text>
            )
          }
          contentContainerStyle={styles.commentsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />

        {currentUser && (
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              value={newComment}
              onChangeText={setNewComment}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]}
              onPress={handleAddComment}
              disabled={!newComment.trim()}
            >
              <Ionicons name="send" size={20} color={newComment.trim() ? "#007AFF" : "#ccc"} />
            </TouchableOpacity>
          </View>
        )}

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
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop: 50,
  },
  postContainer: {
    padding: 15,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
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
    fontSize: 16,
    marginBottom: 10,
    fontFamily: 'Inter_400Regular',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  commentsHeader: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
    color: '#333',
  },
  commentsList: {
    paddingBottom: 100, // Space for comment input
  },
  emptyComments: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
    color: '#666',
    fontFamily: 'Inter_400Regular',
  },
  commentInputContainer: {
    position: 'absolute',
    bottom: 25,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    maxHeight: 80,
  },
  sendButton: {
    padding: 10,
  },
  sendButtonDisabled: {
    opacity: 0.5,
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
  fullImage: {
    width: width,
    height: height * 0.8,
    resizeMode: 'contain',
  },
});
