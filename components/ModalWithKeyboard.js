import React from 'react';
import {
  Modal, View, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, TouchableOpacity, Text
} from 'react-native';
import { useTheme } from '../lib/theme';

export default function ModalWithKeyboard({ visible, onClose, title, children }) {
  const { theme } = useTheme();
  const s = styles(theme);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity activeOpacity={1} style={s.content}>
            <View style={s.header}>
              <Text style={s.title}>{title}</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={s.close}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
              <View style={{ height: 20 }} />
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = (theme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: theme.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text,
  },
  close: {
    color: theme.textSecondary,
    fontSize: 18,
  },
});