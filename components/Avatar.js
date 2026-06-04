import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../lib/theme';

export default function Avatar({ enfant, size = 40 }) {
  const { theme } = useTheme();

  if (enfant?.photo_url) {
    return (
      <Image
        source={{ uri: enfant.photo_url }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
        }}
      />
    );
  }

  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: theme.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      <Text style={{
        color: theme.primary,
        fontSize: size * 0.4,
        fontWeight: 'bold',
      }}>
        {enfant?.prenom?.charAt(0).toLowerCase() || '?'}
      </Text>
    </View>
  );
}