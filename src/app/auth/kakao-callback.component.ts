import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-kakao-callback',
  template: `
    <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #1e3c72;">
      <div style="text-align: center; color: white;">
        <h2>카카오 로그인 처리 중...</h2>
        <p>잠시만 기다려주세요.</p>
      </div>
    </div>
  `,
  styles: [`
    .callback-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
    }

    .loading-spinner {
      text-align: center;
      color: white;
    }

    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 2s linear infinite;
      margin: 0 auto 20px;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    p {
      font-size: 16px;
      margin: 0;
    }
  `]
})
export class KakaoCallbackComponent implements OnInit {
  private apiBaseUrl = environment.apiUrl;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  async ngOnInit() {
    console.log('KakaoCallbackComponent initialized');
    console.log('Current URL:', window.location.href);
    console.log('Query params:', this.route.snapshot.queryParams);

    try {
      // URL 쿼리 파라미터에서 인가 코드와 state 추출
      const code = this.route.snapshot.queryParams['code'];
      const state = this.route.snapshot.queryParams['state'];
      const error = this.route.snapshot.queryParams['error'];

      console.log('Code:', code);
      console.log('State:', state);
      console.log('Error:', error);

      // 에러가 있는 경우 (사용자가 로그인 취소 등)
      if (error) {
        console.error('카카오 로그인 에러:', error);
        alert('로그인이 취소되었습니다.');
        this.router.navigate(['/4spot']);
        return;
      }

      // 인가 코드가 없는 경우
      if (!code) {
        console.error('인가 코드가 없습니다.');
        alert('로그인 처리 중 오류가 발생했습니다.');
        this.router.navigate(['/4spot']);
        return;
      }

      // 서버로 인가 코드 전송하여 토큰 교환
      console.log('API Base URL:', this.apiBaseUrl);
      console.log('Sending request to:', `${this.apiBaseUrl}/auth/kakao/callback`);

      const response = await this.http.post<{
        token: string;
        user: {
          id: string;
          nickname: string;
          profile_image?: string;
        };
        spot_id: string;
      }>(`${this.apiBaseUrl}/auth/kakao/callback`, {
        code,
        state
      }).toPromise();

      if (response) {
        // JWT 토큰 저장
        if (response.token) {
          localStorage.setItem('authToken', response.token);
        }

        // 사용자 정보 저장
        if (response.user) {
          localStorage.setItem('userInfo', JSON.stringify(response.user));
        }

        console.log('카카오 로그인 성공:', response);

        // 사용자의 스팟으로 이동
        if (response.spot_id) {
          this.router.navigate(['/4spot', response.spot_id]);
        } else {
          this.router.navigate(['/4spot']);
        }
      } else {
        throw new Error('서버 응답이 올바르지 않습니다.');
      }

    } catch (error) {
      console.error('카카오 로그인 처리 실패:', error);
      alert('로그인 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
      this.router.navigate(['/4spot']);
    }
  }
}
