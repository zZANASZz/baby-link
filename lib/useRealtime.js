import { useEffect } from 'react';
import { supabase } from './supabase';

export function useRealtime(tables, onUpdate) {
  useEffect(() => {
    const channel = supabase.channel(`realtime-${tables.join('-')}-${Date.now()}`);
    
    tables.forEach(table => {
      channel.on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: table
      }, () => onUpdate());
    });

    channel.subscribe();
    return () => supabase.removeChannel(channel);
  }, []);
}