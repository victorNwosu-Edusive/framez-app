import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';

export default function CreatePostScreen({ navigation }) {
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [isPosting, setIsPosting] = useState(false);
  const { currentUser } = useAuth();

  // Reset form when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      setContent('');
      setImage(null);
    }, [])
  );

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    const response = await fetch(uri);
    const file = await response.arrayBuffer();
    const filename = `post-${Date.now()}.jpg`;

    const { data, error } = await supabase.storage
      .from('posts')
      .upload(filename, file, {
        contentType: 'image/jpeg',
      });

    if (error) throw error;

    const { data: publicUrl } = supabase.storage
      .from('posts')
      .getPublicUrl(filename);

    return publicUrl.publicUrl;
  };

  const handlePost = async () => {
    if (!content.trim() && !image) {
      Alert.alert('Error', 'Please add some content or an image');
      return;
    }

    setIsPosting(true);
    try {
      let imageUrl = null;
      if (image) {
        imageUrl = await uploadImage(image);
      }

      const { error } = await supabase
        .from('posts')
        .insert([
          {
            content,
            image_url: imageUrl,
            author_id: currentUser.uid,
            author_name: currentUser.username || currentUser.email,
            created_at: new Date().toISOString(),
          },
        ]);

      if (error) throw error;

      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Post</Text>
      <TextInput
        style={styles.input}
        placeholder="What's on your mind?"
        value={content}
        onChangeText={setContent}
        multiline
      />
      {image && <Image source={{ uri: image }} style={styles.previewImage} />}
      <TouchableOpacity style={styles.button} onPress={pickImage}>
        <Text style={styles.buttonText}>Pick Image</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.postButton} onPress={handlePost} disabled={isPosting}>
        {isPosting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.postButtonText}>Post</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 70,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    fontFamily: 'Inter_700Bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 20,
    borderRadius: 5,
    height: 100,
    textAlignVertical: 'top',
    fontFamily: 'Inter_400Regular',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#333',
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
  },
  postButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  postButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Inter_700Bold',
  },
});
