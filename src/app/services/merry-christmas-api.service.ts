import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { Spot } from '../pages/merry-christmas/merry-christmas.models';

@Injectable({ providedIn: 'root' })
export class MerryChristmasApiService {
  private readonly apiBaseUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): { [header: string]: string } | undefined {
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  }

  private mapSpotResponse(data: any): Spot {
    return {
      id: data.id,
      ownerId: data.owner_id || data.ownerId,
      title: data.title,
      season: data.season,
      theme_data: data.theme_data,
      shareUrl: data.share_url || data.shareUrl,
      youtube_url: data.youtube_url,
      youtube_video_id: data.youtube_video_id,
      message_count: data.message_count
    };
  }

  async getSpot(spotId: string): Promise<Spot> {
    const response = await lastValueFrom(
      this.http.get<any>(`${this.apiBaseUrl}/spots/${spotId}`)
    );
    return this.mapSpotResponse(response);
  }

  async getUserSpots(userId: string): Promise<Spot[]> {
    const headers = this.getAuthHeaders();
    const options = headers ? { headers } : {};
    const response = await lastValueFrom(
      this.http.get<any[]>(`${this.apiBaseUrl}/users/${userId}/spots`, options)
    );
    return (response || []).map((item: any) => this.mapSpotResponse(item));
  }

  async createSpot(payload: Record<string, any>): Promise<Spot> {
    const headers = this.getAuthHeaders();
    const response = await lastValueFrom(
      this.http.post<any>(`${this.apiBaseUrl}/spots`, payload, { headers })
    );
    return this.mapSpotResponse(response);
  }

  async fetchMessages(spotId: string): Promise<any[]> {
    const response = await lastValueFrom(
      this.http.get<any[]>(`${this.apiBaseUrl}/messages/${spotId}`)
    );
    return response || [];
  }

  async logout(): Promise<void> {
    const token = localStorage.getItem('authToken');
    if (!token) {
      return;
    }

    await lastValueFrom(
      this.http.post(`${this.apiBaseUrl}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
    );
  }
}
