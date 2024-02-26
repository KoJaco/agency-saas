import AgencyDetails from "@/components/forms/agency-details";
import UserDetails from "@/components/forms/user-details";
import { db } from "@/lib/db";
import { currentUser } from "@clerk/nextjs";
import React from "react";

type Props = {
    params: { agencyId: string };
};

const AgencySettings = async ({ params }: Props) => {
    const authUser = await currentUser();

    if (!authUser) return null;

    const userDetails = await db.user.findUnique({
        where: {
            email: authUser.emailAddresses[0].emailAddress,
        },
    });

    if (!userDetails) return null;

    const agencyDetails = await db.agency.findUnique({
        where: {
            id: params.agencyId,
        },
        include: {
            SubAccount: true,
        },
    });

    if (!agencyDetails) return null;

    const subAccounts = agencyDetails.SubAccount;

    // TODO: Maybe add toggle tabs between agency and user details on desktop, slightly better UX.

    return (
        <div className="flex 2xl:flex-row flex-col gap-4">
            <UserDetails
                type="agency"
                id={params.agencyId}
                subAccounts={subAccounts}
                userData={userDetails}
            />
            <AgencyDetails data={agencyDetails} />
        </div>
    );
};

export default AgencySettings;
