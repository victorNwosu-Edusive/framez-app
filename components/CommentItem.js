import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';

export default function CommentItem({ comment, onDeleteComment, navigation }) {
  const { currentUser } = useAuth();

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const handleDeleteComment = () => {
    const isOwner = currentUser && currentUser.uid === comment.user_id;
    if (!isOwner) return;

    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('comments')
                .delete()
                .eq('id', comment.id);
              if (error) throw error;
              onDeleteComment(comment.id);
            } catch (err) {
              Alert.alert('Error', 'Failed to delete comment');
            }
          },
        },
      ]
    );
  };

  const isOwner = currentUser && currentUser.uid === comment.user_id;

  const handleAuthorPress = () => {
    if (comment.user_id && comment.user_id !== currentUser?.uid) {
      navigation.navigate('Profile', { userId: comment.user_id });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleAuthorPress}>
          <Text style={styles.author}>{comment.author_name || 'Anonymous'}</Text>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <Text style={styles.timestamp}>{formatDate(comment.created_at)}</Text>
          {isOwner && (
            <TouchableOpacity onPress={handleDeleteComment} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={16} color="#FF3B30" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Text style={styles.content}>{comment.content}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fafafa',
    marginHorizontal: 15,
    marginVertical: 2,
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    marginLeft: 10,
  },
  author: {
    fontWeight: 'bold',
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: '#333',
  },
  timestamp: {
    fontSize: 11,
    color: '#666',
    fontFamily: 'Inter_400Regular',
  },
  content: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'Inter_400Regular',
    lineHeight: 18,
  },
});
