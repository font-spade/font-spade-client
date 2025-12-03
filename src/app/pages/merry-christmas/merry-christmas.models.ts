export interface User {
  id: string;
  nickname: string;
  profileImage?: string;
  kakaoId?: number;
}

export interface Spot {
  id: string;
  ownerId: string;
  title: string;
  season: string;
  theme_data?: any;
  shareUrl: string;
  youtube_url?: string;
  youtube_video_id?: string;
  message_count?: number;
}

export interface AuthState {
  isLoggedIn: boolean;
  user?: User;
  currentSpotId?: string;
}
