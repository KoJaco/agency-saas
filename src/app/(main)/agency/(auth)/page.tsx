import { currentUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import React from "react";
import { getAuthUserDetails, verifyAndAcceptInvitation } from "@/lib/queries";
import { Plan } from "@prisma/client";
import AgencyDetails from "@/components/forms/agency-details";

const page = async ({
    searchParams,
}: {
    searchParams: { plan: Plan; state: string; code: string };
}) => {
    // what if the user was sent an invitation
    const agencyId = await verifyAndAcceptInvitation();

    console.log(agencyId);

    // get user details
    const user = await getAuthUserDetails();

    // if we don't get any data back we must prompt the user to create an agency/sub account

    // TODO: we want to add functionality for guest accounts

    if (agencyId) {
        if (
            user?.role === "SUBACCOUNT_GUEST" ||
            user?.role === "SUBACCOUNT_USER"
        ) {
            return redirect("/subaccount");
        } else if (
            user?.role === "AGENCY_OWNER" ||
            user?.role === "AGENCY_ADMIN"
        ) {
            if (searchParams.plan) {
                // show payment plan on screen immediately
                return redirect(
                    `/agency/${agencyId}/billing?=${searchParams.plan}`
                );
            }
            if (searchParams.state) {
                // connect any user's stripe account ... stripe allows us to pass in a state property and then process a response from there... state will have the id we want.
                const statePath = searchParams.state.split("__")[0];
                const stateAgencyId = searchParams.state.split("___")[1];

                if (!stateAgencyId) return <div>Not Authorized</div>; // TODO: build out component

                return redirect(
                    `/agency/${stateAgencyId}/${statePath}?code=${searchParams.code}`
                );
            } else {
                return redirect(`/agency/${agencyId}`);
            }
        } else {
            return <div>Not Authorized</div>;
        }
    }

    const authUser = await currentUser();

    return (
        <div className="flex justify-center items-center mt-4">
            <div className="max-w-[850px] p-4 rounded-sm">
                <h1 className="text-2xl mb-6">Create an agency</h1>
                <AgencyDetails
                    data={{
                        companyEmail: authUser?.emailAddresses[0].emailAddress,
                    }}
                />
            </div>
        </div>
    );
};

export default page;
