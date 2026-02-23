import { createClient } from '@supabase/supabase-js';
import { GameState } from './game/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface GameRoom {
  id: string;
  state: GameState;
  created_at: string;
}

export async function getRoom(roomId: string): Promise<GameRoom | null> {
  const { data, error } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('id', roomId)
    .single();
  if (error || !data) return null;
  return data as GameRoom;
}

export async function updateRoom(roomId: string, state: GameState): Promise<void> {
  const { error } = await supabase
    .from('game_rooms')
    .update({ state })
    .eq('id', roomId);
  if (error) throw new Error(error.message);
}
