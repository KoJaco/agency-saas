import { getAuthUserDetails } from "@/lib/queries";
import React from "react";
import MenuOptions from "./menu-options";

type SidebarProps = {
    id: string;
    type: "agency" | "subaccount";
};

const Sidebar = async ({ id, type }: SidebarProps) => {
    const user = await getAuthUserDetails();

    if (!user) return null;

    console.log(user?.Agency);

    if (!user.Agency) return;

    const details =
        type === "agency"
            ? user?.Agency
            : user?.Agency.SubAccount.find(
                  (subaccount) => subaccount.id === id
              );

    const isWhiteLabeledAgency = user.Agency.whiteLabel;

    if (!details) return;

    let sideBarLogo = user.Agency.agencyLogo || "/assets/default-logo.png";

    if (!isWhiteLabeledAgency) {
        if (type === "subaccount") {
            sideBarLogo =
                user?.Agency.SubAccount.find(
                    (subaccount) => subaccount.id === id
                )?.subAccountLogo || user.Agency.agencyLogo;
        }
    }

    const sidebarOpt =
        type === "agency"
            ? user.Agency.SidebarOption || []
            : user.Agency.SubAccount.find((subaccount) => subaccount.id === id)
                  ?.SidebarOption || [];

    const subaccounts = user.Agency.SubAccount.filter((subaccount) =>
        user.Permissions.find(
            (permission) =>
                permission.subAccountId === subaccount.id && permission.access
        )
    );

    return (
        <>
            <MenuOptions
                defaultOpen={true}
                details={details}
                subAccounts={subaccounts}
                sidebarOpt={sidebarOpt}
                sidebarLogo={sideBarLogo}
                user={user}
                id={id}
            />
            <MenuOptions
                defaultOpen={false}
                details={details}
                subAccounts={subaccounts}
                sidebarOpt={sidebarOpt}
                sidebarLogo={sideBarLogo}
                user={user}
                id={id}
            />
        </>
    );
};

export default Sidebar;
