import React from "react";

export {};

declare global {
    module 'react-native-popup-menu' {
        interface MenuProps extends React.PropsWithChildren {
        }

        interface MenuTriggerProps extends React.PropsWithChildren {
        }

        interface MenuOptionProps extends React.PropsWithChildren {
        }

        interface MenuOptionsProps extends React.PropsWithChildren {
        }

        interface MenuProviderProps extends React.PropsWithChildren {
        }
    }
}
