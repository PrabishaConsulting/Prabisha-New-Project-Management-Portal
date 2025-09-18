import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

export const getCurrentUser = async () => {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
    return null;
    }
    return session.user;
};