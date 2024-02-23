"use client";
import type { TicketDetails } from "@/lib/types";
import { Agency, Contact, Plan, User } from "@prisma/client";
import { createContext, useContext, useEffect, useRef, useState } from "react";

/**
 *
 * Provider is used for global modal state management
 *
 * 1. Maintain open/closed context
 * 2. setter functions
 *
 * TODO: Is it better to use something like Zustand for this? What does useContext do behind the hood?
 *
 */

interface ModalProviderProps {
    children: React.ReactNode;
}

export type ModalData = {
    user?: User;
    agency?: Agency;
    ticket?: TicketDetails[0];
    contact?: Contact;
    // plans?: {
    //     defaultPriceId: Plan;
    //     plans: PricesList["data"];
    // };
};

type ModalContextType = {
    data: ModalData;
    isOpen: boolean;
    setOpen: (modal: React.ReactNode, fetchData?: () => Promise<any>) => void;
    setClose: () => void;
};

export const ModalContext = createContext<ModalContextType>({
    data: {},
    isOpen: false,
    setOpen: (modal: React.ReactNode, fetchData?: () => Promise<any>) => {},
    setClose: () => {},
});

const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [data, setData] = useState<ModalData>({});
    const [showingModal, setShowingModal] = useState<React.ReactNode>(null);

    /** Must check whether component is mounted.
     *
     * 1) ref
     *
     * const isMounted = useRef(false)
     *
     * useEffect(() => {
     *      mounted.current = true;
     *
     *      return () => {
     *          mounted.current = false;
     *      }
     * }, [])
     *
     * 2) state
     *
     * const [isMounted, setIsMounted] = useState(false)
     *
     * useEffect(() => {
     *      setIsMounted(true);
     *
     *      return () => {
     *          setIsMounted(false);
     *      }
     * }, [])
     *
     * useRef() is for specifically tracking mount/unmount status without causing re-renders... does not trigger re-renders when the value changes, unlike state & the .current property of the ref persists across renders.
     * useState() is for managing other component state and triggering re-renders when the state changes.
     *
     * */

    const isMounted = useRef(false);

    useEffect(() => {
        isMounted.current = true;

        return () => {
            isMounted.current = false;
        };
    }, []);

    const setOpen = async (
        modal: React.ReactNode,
        fetchData?: () => Promise<any>
    ) => {
        if (modal) {
            if (fetchData) {
                setData({ ...data, ...(await fetchData()) } || {});
            }
            setShowingModal(modal);
            setIsOpen(true);
        }
    };

    const setClose = () => {
        setIsOpen(false);
        setData({});
    };

    if (!isMounted) return null;

    return (
        <ModalContext.Provider value={{ data, setOpen, setClose, isOpen }}>
            {children}
            {showingModal}
        </ModalContext.Provider>
    );
};

export const useModal = () => {
    const context = useContext(ModalContext);
    if (!context) {
        throw new Error(
            "useModal() must only be used within the modal provider"
        );
    }
    return context;
};

export default ModalProvider;
