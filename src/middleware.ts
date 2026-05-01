import { withAuth } from "next-auth/middleware";

// /portfolio 하위 경로는 로그인 필수. 미인증 시 /login으로 직접 리다이렉트.
export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: ["/portfolio", "/portfolio/(.*)"],
};
