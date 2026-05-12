'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSession, signIn, signOut } from 'next-auth/react';

export default function AcceptInvitationClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');
    const authToken = searchParams.get('auth_token');
    const { data: session, status } = useSession();

    const [message, setMessage] = useState('Preparing invitation...');
    const [error, setError] = useState('');
    const [isAccepting, setIsAccepting] = useState(false);

    // --- NEWLY ADDED ---
    // This effect runs once on mount to clear any existing user session.
    useEffect(() => {
        signOut({ redirect: false });
    }, []); // Empty dependency array ensures this runs only once.

    // This effect handles the auto-login logic if an auth_token is present
    useEffect(() => {
        if (authToken && status === 'unauthenticated') {
            setMessage('Logging you in securely...');
            signIn('credentials', { token: authToken, redirect: false })
                .then((res) => {
                    if (res?.error) {
                        setError("Your magic link is invalid or has expired. Please log in manually.");
                        setMessage('');
                        setTimeout(() => router.push(`/?invitationToken=${token}`), 3000);
                    }
                });
        }
    }, [authToken, status, token, router]);

    // This effect handles the page state based on authentication status
    useEffect(() => {
        if (status === 'authenticated') {
            setMessage('You are invited to join a workspace. Click below to accept.');
        } else if (status === 'unauthenticated' && !authToken) {
            // After signOut is complete, if there's no magic link, redirect to login.
            const loginUrl = token ? `/?invitationToken=${token}` : '/login';
            router.push(loginUrl);
        }
    }, [status, authToken, token, router]);
    
    const handleAccept = async () => {
        if (!token) {
            setError('Invitation token is missing.');
            return;
        }
        setIsAccepting(true);
        setError('');
        try {
            const response = await fetch('/api/invitations/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Failed to accept invitation.');
            }
            router.push(`/workspaces/${result.workspaceId}/members`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsAccepting(false);
        }
    };

    // Updated loading state to handle the initial sign-out and potential sign-in
    if (status === 'loading' || (status === 'unauthenticated' && authToken)) {
       return (
         <div className="flex flex-col items-center justify-center min-h-screen text-white p-4">
            <h1 className="text-3xl font-bold">Verifying Invitation...</h1>
         </div>
       );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-white p-4">
            <h1 className="text-3xl font-bold mb-4">Accept Invitation</h1>
            <p className="text-zinc-400 mb-6">{message}</p>
            {status === 'authenticated' && !error && (
                <Button onClick={handleAccept} disabled={isAccepting}>
                    {isAccepting ? 'Joining Workspace...' : 'Accept & Join Workspace'}
                </Button>
            )}
            {error && <p className="text-red-500 mt-4">{error}</p>}
        </div>
    );
}