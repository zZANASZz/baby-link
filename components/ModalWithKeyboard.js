import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, KeyboardAvoidingView,
  Platform, ScrollView, StyleSheet, TouchableOpacity, Text, useWindowDimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme';

export default function ModalWithKeyboard({ visible, onClose, title, children }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const scrollRef = useRef(null);
  const [viewportHeight, setViewportHeight] = useState(height);
  const s = styles(theme);
  const maxModalHeight = Math.max(280, Math.min(viewportHeight, height) - insets.top - 16);

  useEffect(() => {
    if (Platform.OS !== 'web' || !visible || typeof window === 'undefined') return;

    const updateViewportHeight = () => {
      setViewportHeight(window.visualViewport?.height || window.innerHeight || height);
    };

    const scrollFocusedInputIntoView = (event) => {
      const node = scrollRef.current?.getScrollableNode?.();
      const target = event.target;
      if (!node || !target || !node.contains(target)) return;

      window.setTimeout(() => {
        target.scrollIntoView?.({ block: 'center', inline: 'nearest', behavior: 'smooth' });
      }, 80);
    };

    updateViewportHeight();
    window.visualViewport?.addEventListener('resize', updateViewportHeight);
    window.visualViewport?.addEventListener('scroll', updateViewportHeight);
    document.addEventListener('focusin', scrollFocusedInputIntoView);

    return () => {
      window.visualViewport?.removeEventListener('resize', updateViewportHeight);
      window.visualViewport?.removeEventListener('scroll', updateViewportHeight);
      document.removeEventListener('focusin', scrollFocusedInputIntoView);
    };
  }, [height, visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <TouchableOpacity style={s.backdrop} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
          style={s.kavWrapper}
        >
          <View style={[s.content, { maxHeight: maxModalHeight }]}>
            <View style={s.header}>
              <Text style={s.title}>{title}</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Text style={s.close}>x</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              ref={scrollRef}
              style={s.scroll}
              contentContainerStyle={[s.scrollContent, { paddingBottom: Math.max(24, insets.bottom + 20) }]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              showsVerticalScrollIndicator={false}
              bounces
            >
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = (theme) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  kavWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: theme.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { maxHeight: '90dvh' } : {}),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.text,
  },
  close: {
    color: theme.textSecondary,
    fontSize: 18,
    padding: 4,
  },
  scroll: {
    flexGrow: 0,
    ...(Platform.OS === 'web' ? { overflowY: 'auto', WebkitOverflowScrolling: 'touch' } : {}),
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
});
