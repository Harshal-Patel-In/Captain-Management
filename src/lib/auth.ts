/**
 * @deprecated This file contains legacy password-based authentication.
 * 
 * ⚠️ DO NOT USE - Migrate to Clerk Authentication
 * 
 * This authentication system has been replaced by Clerk (@clerk/nextjs).
 * It is kept only for reference and will be removed in a future version.
 * 
 * Migration Guide:
 * - Replace auth.isAuthenticated() with useAuth() from @clerk/nextjs
 * - Replace auth.unlock() with Clerk SignIn component
 * - Replace auth.lock() with Clerk signOut()
 * 
 * @see https://clerk.com/docs
 */

const AUTH_KEY = "inventory_unlocked";

export const auth = {
    /**
     * @deprecated Use Clerk's useAuth().isSignedIn instead
     * @example
     * import { useAuth } from '@clerk/nextjs';
     * const { isSignedIn } = useAuth();
     */
    isAuthenticated(): boolean {
        console.warn('⚠️ auth.isAuthenticated() is DEPRECATED. Use Clerk useAuth().isSignedIn instead.');
        if (typeof window === "undefined") return false;
        return sessionStorage.getItem(AUTH_KEY) === "true";
    },

    /**
     * @deprecated Use Clerk SignIn component instead
     * @example
     * import { SignIn } from '@clerk/nextjs';
     * <SignIn />
     */
    unlock(password: string): boolean {
        console.warn('⚠️ auth.unlock() is DEPRECATED. Use Clerk SignIn component instead.');
        const correctPassword = process.env.NEXT_PUBLIC_APP_PASSWORD;

        if (password === correctPassword) {
            sessionStorage.setItem(AUTH_KEY, "true");
            return true;
        }

        return false;
    },

    /**
     * @deprecated Use Clerk's signOut() instead
     * @example
     * import { useClerk } from '@clerk/nextjs';
     * const { signOut } = useClerk();
     * await signOut();
     */
    lock(): void {
        console.warn('⚠️ auth.lock() is DEPRECATED. Use Clerk signOut() instead.');
        sessionStorage.removeItem(AUTH_KEY);
    },
};
