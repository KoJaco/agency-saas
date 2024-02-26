import Unauthorized from "@/components/unauthorized";
import { getAuthUserDetails, verifyAndAcceptInvitation } from "@/lib/queries";
import { redirect } from "next/navigation";
import React from "react";

type Props = {
    // State and Code come from Stripe... state will be the subAccountId
    searchParams: { state: string; code: string };
};

const MainSubAccount = async ({ searchParams }: Props) => {
    const agencyId = await verifyAndAcceptInvitation();

    if (!agencyId) {
        return <Unauthorized />;
    }

    const user = await getAuthUserDetails();
    if (!user) return;

    const getFirstSubaccountWithAccess = user.Permissions.find(
        (permission) => permission.access === true
    );

    // TODO: Must test this

    if (searchParams.state) {
        const statePath = searchParams.state.split("___")[0];
        const stateSubaccountId = searchParams.state.split("___")[1];

        if (!stateSubaccountId) return <Unauthorized />;

        return redirect(
            `/subaccount/${stateSubaccountId}/${statePath}?code=${searchParams.code}`
        );
    }

    if (getFirstSubaccountWithAccess) {
        return redirect(
            `/subaccount/${getFirstSubaccountWithAccess.subAccountId}`
        );
    }

    // if everything fails then...

    return <Unauthorized />;
};

export default MainSubAccount;
