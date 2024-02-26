"use server";
import { clerkClient, currentUser } from "@clerk/nextjs";
import { db } from "./db";
import { redirect } from "next/navigation";
import { Agency, Plan, SubAccount, User } from "@prisma/client";
import { CreateMediaType } from "./types";
import { v4 } from "uuid";
// server actions file

export const getAuthUserDetails = async () => {
    const user = await currentUser();

    if (!user) {
        // needs error handling?
        return;
    }

    // follow prisma schema, we want sidebarOption included
    const userData = await db.user.findUnique({
        where: {
            email: user.emailAddresses[0].emailAddress,
        },
        include: {
            Agency: {
                include: {
                    SidebarOption: true,
                    SubAccount: {
                        include: {
                            SidebarOption: true,
                        },
                    },
                },
            },
            Permissions: true,
        },
    });

    return userData;
};

export const createTeamUser = async (agencyId: string, user: User) => {
    // if they're an agency owner they already have access...
    if (user.role === "AGENCY_OWNER") return null;
    const response = await db.user.create({ data: { ...user } });
    return response;
};

// Helper function
export const saveActivityLogsNotification = async ({
    agencyId,
    description,
    subaccountId,
}: {
    agencyId?: string;
    description: string;
    subaccountId?: string;
}) => {
    const authUser = await currentUser();
    let userData;
    if (!authUser) {
        // what if we are creating an activity log for a contact and there is no auth user... we must just find the user in the subaccount.
        const response = await db.user.findFirst({
            where: {
                Agency: {
                    SubAccount: {
                        some: { id: subaccountId },
                    },
                },
            },
        });
        if (response) {
            userData = response;
        }
    } else {
        userData = await db.user.findUnique({
            where: { email: authUser?.emailAddresses[0].emailAddress },
        });
    }

    if (!userData) {
        // TODO: add proper error handling, toast
        console.log("Could not find a user");
        return;
    }

    let foundAgencyId = agencyId;
    if (!foundAgencyId) {
        if (!subaccountId) {
            // TODO: add proper error handling, toast
            throw new Error(
                "You need to provide at least an agency Id or subaccount Id"
            );
        }
        const response = await db.subAccount.findUnique({
            where: { id: subaccountId },
        });
        if (response) foundAgencyId = response.agencyId;
    }
    if (subaccountId) {
        await db.notification.create({
            data: {
                notification: `${userData.name} | ${description}`,
                User: {
                    connect: {
                        id: userData.id,
                    },
                },
                Agency: {
                    connect: {
                        id: foundAgencyId,
                    },
                },
                SubAccount: {
                    connect: { id: subaccountId },
                },
            },
        });
    } else {
        await db.notification.create({
            data: {
                notification: `${userData.name} | ${description}`,
                User: {
                    connect: {
                        id: userData.id,
                    },
                },
                Agency: {
                    connect: {
                        id: foundAgencyId,
                    },
                },
            },
        });
    }
};

export const verifyAndAcceptInvitation = async () => {
    // redirect to account creation if there isn't any record of the user.
    const user = await currentUser();
    if (!user) return redirect("/sign-in");

    // if the invitation exists (they are invited) we want their status to change to pending
    const invitationExists = await db.invitation.findUnique({
        where: {
            email: user.emailAddresses[0].emailAddress,
            status: "PENDING",
        },
    });

    // logic if invitation exists / does not exist
    if (invitationExists) {
        const userDetails = await createTeamUser(invitationExists.agencyId, {
            email: invitationExists.email,
            agencyId: invitationExists.agencyId,
            avatarUrl: user.imageUrl,
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            role: invitationExists.role, // TODO: remember to attach a role to our invitations
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        // when any action is performed, we want to save that data.
        await saveActivityLogsNotification({
            agencyId: invitationExists?.agencyId,
            description: `Joined`,
            subaccountId: undefined,
        });

        if (userDetails) {
            await clerkClient.users.updateUserMetadata(user.id, {
                privateMetadata: {
                    role: userDetails.role || "SUBACCOUNT_USER",
                },
            });

            await db.invitation.delete({
                where: { email: userDetails.email },
            });

            return userDetails.agencyId;
        } else return null;
    } else {
        const agency = await db.user.findUnique({
            where: {
                email: user.emailAddresses[0].emailAddress,
            },
        });
        return agency ? agency.agencyId : null;
    }
};

export const deleteAgency = async (agencyId: string) => {
    const response = await db.agency.delete({ where: { id: agencyId } });
    return response;
};

export const initUser = async (newUser: Partial<User>) => {
    const user = await currentUser();

    if (!user) return;

    const userData = await db.user.upsert({
        where: {
            email: user.emailAddresses[0].emailAddress,
        },
        update: newUser,
        create: {
            id: user.id,
            avatarUrl: user.imageUrl,
            email: user.emailAddresses[0].emailAddress,
            name: `${user.firstName} ${user.lastName}`,
            role: newUser.role || "SUBACCOUNT_USER",
        },
    });

    await clerkClient.users.updateUserMetadata(user.id, {
        privateMetadata: {
            role: newUser.role || "SUBACCOUNT_USER",
        },
    });

    return userData;
};

export const upsertAgency = async (agency: Agency, price?: Plan) => {
    if (!agency.companyEmail) return null;
    try {
        const agencyDetails = await db.agency.upsert({
            where: {
                id: agency.id,
            },
            update: agency,
            create: {
                users: {
                    connect: { email: agency.companyEmail },
                },
                ...agency,
                SidebarOption: {
                    create: [
                        {
                            name: "Dashboard",
                            icon: "category",
                            link: `/agency/${agency.id}`,
                        },
                        {
                            name: "Launchpad",
                            icon: "clipboardIcon",
                            link: `/agency/${agency.id}/launchpad`,
                        },
                        {
                            name: "Billing",
                            icon: "payment",
                            link: `/agency/${agency.id}/billing`,
                        },
                        {
                            name: "Settings",
                            icon: "settings",
                            link: `/agency/${agency.id}/settings`,
                        },
                        {
                            name: "Sub Accounts",
                            icon: "person",
                            link: `/agency/${agency.id}/all-subaccounts`,
                        },
                        {
                            name: "Team",
                            icon: "shield",
                            link: `/agency/${agency.id}/team`,
                        },
                    ],
                },
            },
        });
        return agencyDetails;
    } catch (error) {
        console.log(error);
    }
};

export const updateAgencyDetails = async (
    agencyId: string,
    agencyDetails: Partial<Agency>
) => {
    const response = await db.agency.update({
        where: { id: agencyId },
        data: { ...agencyDetails },
    });
    return response;
};

export const _getTicketsWithAllRelations = async (laneId: string) => {
    const response = await db.ticket.findMany({
        where: { laneId: laneId },
        include: {
            Assigned: true,
            Customer: true,
            Lane: true,
            Tags: true,
        },
    });
    return response;
};

export const getFunnel = async (funnelId: string) => {
    const funnel = await db.funnel.findUnique({
        where: { id: funnelId },
        include: {
            FunnelPages: {
                orderBy: {
                    order: "asc",
                },
            },
        },
    });

    return funnel;
};

export const getFunnels = async (subaccountId: string) => {
    const funnels = await db.funnel.findMany({
        where: { subAccountId: subaccountId },
        include: { FunnelPages: true },
    });

    return funnels;
};

export const getMedia = async (subaccountId: string) => {
    const media = await db.subAccount.findUnique({
        where: {
            id: subaccountId,
        },
        include: { Media: true },
    });

    return media;
};

export const createMedia = async (
    subaccountId: string,
    mediaFile: CreateMediaType
) => {
    const response = await db.media.create({
        data: {
            link: mediaFile.link,
            name: mediaFile.name,
            subAccountId: subaccountId,
        },
    });

    return response;
};

export const getPipelineDetails = async (pipelineId: string) => {
    const pipeline = await db.pipeline.findUnique({
        where: {
            id: pipelineId,
        },
    });

    return pipeline;
};

// using pipelineId here
export const getTicketsWithTags = async (pipelineId: string) => {
    const tickets = await db.ticket.findMany({
        where: {
            Lane: {
                pipelineId,
            },
        },
        include: { Tags: true, Assigned: true, Customer: true },
    });

    return tickets;
};

export const getUserPermissions = async (userId: string) => {
    const userPermissions = await db.user.findUnique({
        where: { id: userId },
        select: { Permissions: { include: { SubAccount: true } } },
    });

    return userPermissions;
};

export const getNotificationAndUser = async (agencyId: string) => {
    try {
        const response = await db.notification.findMany({
            where: { agencyId },
            include: { User: true },
            orderBy: {
                createdAt: "desc",
            },
        });
        return response;
    } catch (error) {
        // TODO: Proper error handling
        console.error(error);
        console.log(error);
    }
};

export const upsertSubAccount = async (subAccount: SubAccount) => {
    if (!subAccount.companyEmail) return null;

    const agencyOwner = await db.user.findFirst({
        where: {
            Agency: {
                id: subAccount.agencyId,
            },
            role: "AGENCY_OWNER",
        },
    });

    // TODO: Proper error handling

    if (!agencyOwner) return console.log("Error: Could not create subaccount!");

    const permissionId = v4();

    const response = await db.subAccount.upsert({
        where: { id: subAccount.id },
        update: subAccount,
        create: {
            ...subAccount,
            Permissions: {
                create: {
                    access: true,
                    email: agencyOwner.email,
                    id: permissionId,
                },
                connect: {
                    subAccountId: subAccount.id,
                    id: permissionId,
                },
            },
            Pipeline: {
                create: { name: "Lead Cycle" },
            },
            SidebarOption: {
                create: [
                    {
                        name: "Launchpad",
                        icon: "clipboardIcon",
                        link: `/subaccount/${subAccount.id}/launchpad`,
                    },
                    {
                        name: "Settings",
                        icon: "settings",
                        link: `/subaccount/${subAccount.id}/settings`,
                    },
                    {
                        name: "Funnels",
                        icon: "pipelines",
                        link: `/subaccount/${subAccount.id}/funnels`,
                    },
                    {
                        name: "Media",
                        icon: "database",
                        link: `/subaccount/${subAccount.id}/media`,
                    },
                    {
                        name: "Automations",
                        icon: "chip",
                        link: `/subaccount/${subAccount.id}/automations`,
                    },
                    {
                        name: "Pipelines",
                        icon: "flag",
                        link: `/subaccount/${subAccount.id}/pipelines`,
                    },
                    {
                        name: "Contacts",
                        icon: "person",
                        link: `/subaccount/${subAccount.id}/contacts`,
                    },
                    {
                        name: "Dashboard",
                        icon: "category",
                        link: `/subaccount/${subAccount.id}`,
                    },
                ],
            },
        },
    });

    return response;
};

// TODO: is it worth adding another func to update multiple?
export const changeUserPermissions = async (
    permissionId: string | undefined,
    userEmail: string,
    subAccountId: string,
    permission: boolean
) => {
    try {
        const response = await db.permissions.upsert({
            where: { id: permissionId },
            update: { access: permission },
            create: {
                access: permission,
                email: userEmail,
                subAccountId: subAccountId,
            },
        });

        return response;
    } catch (error) {
        // TODO: Proper error reporting
        console.log("Could not change permission!", error);
    }
};

export const updateUser = async (user: Partial<User>) => {
    const response = await db.user.update({
        where: { email: user.email },
        data: { ...user },
    });

    await clerkClient.users.updateUserMetadata(response.id, {
        privateMetadata: {
            role: user.role || "SUBACCOUNT_USER",
        },
    });

    return response;
};

export async function deleteSubAccount(subaccountId: string) {
    const response = await db.subAccount.delete({
        where: {
            id: subaccountId,
        },
    });
    return response;
}

export async function getSubaccountDetails(subaccountId: string) {
    const response = await db.subAccount.findUnique({
        where: {
            id: subaccountId,
        },
    });

    return response;
}
