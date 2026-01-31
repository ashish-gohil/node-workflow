// import NextAuth from "next-auth";
// import Credentials from "next-auth/providers/credentials";
// import Google from "next-auth/providers/google";

// const handler = NextAuth({
//     providers: [
//         Credentials({
//             name: "Credentials",
//             credentials: {
//                 email: {},
//                 password: {},
//             },
//             async authorize(credentials) {
//                 const res = await fetch(
//                     `${process.env.NEXT_PUBLIC_API_URL}/auth/credentials`,
//                     {
//                         method: "POST",
//                         headers: { "Content-Type": "application/json" },
//                         body: JSON.stringify(credentials),
//                     }
//                 );

//                 if (!res.ok) return null;
//                 return await res.json();
//             },
//         }),

//         Google({
//             clientId: process.env.GOOGLE_CLIENT_ID!,
//             clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
//         }),
//     ],

//     callbacks: {
//         async signIn({ user, account }) {
//             if (account?.provider === "google") {
//                 await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/oauth`, {
//                     method: "POST",
//                     headers: { "Content-Type": "application/json" },
//                     body: JSON.stringify({
//                         email: user.email,
//                         name: user.name,
//                         image: user.image,
//                         provider: "google",
//                     }),
//                 });
//             }
//             return true;
//         },

//         async jwt({ token, user }) {
//             if (user) token.id = user.id;
//             return token;
//         },

//         async session({ session, token }) {
//             if (session.user) { session.user.id = token.id as string; }
//             return session;
//         },
//     },

//     session: { strategy: "jwt" },
//     secret: process.env.NEXTAUTH_SECRET,
// });

// export { handler as GET, handler as POST };
