import BlurPage from "@/components/global/blur-page";
import InfoBar from "@/components/global/info-bar";
import Sidebar from "@/components/sidebar";
import Unauthorized from "@/components/unauthorized";
import {
    getNotificationAndUser,
    verifyAndAcceptInvitation,
} from "@/lib/queries";
import { currentUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import React from "react";

type Props = {
    children: React.ReactNode;
    params: { agencyId: string };
};

// TODO: Do we really need blur page if we're restructuring sidebar?

const layout = async ({ children, params }: Props) => {
    const agencyId = await verifyAndAcceptInvitation();
    const user = await currentUser();

    if (!user) {
        return redirect("/");
    }

    if (!agencyId) {
        return redirect("/agency");
    }

    if (
        user.privateMetadata.role !== "AGENCY_OWNER" &&
        user.privateMetadata.role !== "AGENCY_ADMIN"
    )
        return <Unauthorized />;

    let allNotifications: any = [];
    const notifications = await getNotificationAndUser(agencyId);
    if (notifications) allNotifications = notifications;

    // TODO: Change styling to match Clerk dashboard, inverse card for content basically.
    // TODO: for settings, add Clerk general/danger tabs for settings... I like this.

    return (
        <div className="h-auto min-h-screen overflow-hidden">
            <Sidebar id={params.agencyId} type="agency" />
            <div className="md:pl-[300px] flex justify-center">
                <InfoBar
                    notifications={allNotifications}
                    role={allNotifications.User?.role}
                />
                {/* <div className="relative">
                    <BlurPage>{children}</BlurPage>
                </div> */}
                <div className="static mt-24 mb-8 w-[95%]">{children}</div>
            </div>
        </div>
    );
};

export default layout;
