export { default } from "next-auth/middleware";

export const config = {
  // /portfolio 하위 모든 경로를 인증 필요로 설정
  // /login, /api/auth 경로는 제외(미들웨어 적용 안 됨)
  matcher: ["/portfolio/:path*"],
};
