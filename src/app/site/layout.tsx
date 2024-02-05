import Navigation from "@/components/site/navigation";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import React from "react";

const layout = ({ children }: { children: React.ReactNode }) => {
    return (
        <ClerkProvider appearance={{ baseTheme: dark }}>
            <Navigation />
            <main className="h-full">
                {children}{" "}
                <footer className="flex h-[300px] w-full mt-40 justify-center items-center bg-primary/10">
                    Footer
                </footer>
            </main>
        </ClerkProvider>
    );
};

export default layout;
