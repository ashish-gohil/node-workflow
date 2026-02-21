import NextAuth, { type User } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

interface BackendUser extends User {
    id: string;
    email: string;
    accessToken: string;
}

const handler = NextAuth({

    providers: [

        Credentials({
            name: "Credentials",
            credentials: {
                email: {},
                password: {},
            },

            async authorize(credentials) {

                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/auth/credentials`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(credentials),
                    }
                );

                if (!res.ok) return null;

                const user = await res.json();

                if (!user?.id || !user?.accessToken) {
                    return null;
                }

                return user;
            }
        }),

        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],

    callbacks: {

        async jwt({ token, user, account }) {

            // Credentials login
            if (user && account?.provider === "credentials") {

                token.sub = user.id;
                token.email = user.email;
                token.backendToken = (user as BackendUser).accessToken;
            }

            // Google OAuth login
            if (account?.provider === "google") {

                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/auth/oauth`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            email: user?.email,
                            name: user?.name,
                            image: user?.image,
                            provider: "google",
                        }),
                    }
                );

                const backendUser = await res.json();

                token.sub = backendUser.id;
                token.email = backendUser.email;
                token.backendToken = backendUser.accessToken;
            }

            return token;
        },

        async session({ session, token }) {

            session.user.id = token.sub as string;
            session.user.email = token.email as string;

            (session as any).backendToken = token.backendToken;

            return session;
        },
    },

    session: {
        strategy: "jwt"
    },

    secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };