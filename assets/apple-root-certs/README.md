# Apple Root Certificates

iOS 인앱 구독 검증(`IosSubscriptionVerifier`)에 필요한 Apple 루트 인증서를 이 디렉토리에 넣습니다.

1. https://www.apple.com/certificateauthority/ 접속
2. "Apple Root Certificates" 섹션에서 인증서(.cer) 파일 다운로드
   - Apple Root CA - G3 (필수, 최신 App Store 서명에 사용)
   - 필요 시 다른 루트 인증서도 함께 추가 가능
3. 다운로드한 `.cer` 파일을 이 디렉토리에 그대로 저장 (파일명 무관, 확장자만 `.cer`)

`IosSubscriptionVerifier`가 서버 시작 시 이 디렉토리의 모든 `.cer` 파일을 읽어 `SignedDataVerifier`에 전달합니다.
`.cer` 파일 자체는 공개 인증서이므로 git에 커밋해도 안전합니다.
