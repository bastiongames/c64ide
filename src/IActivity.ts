import * as React from 'react';

export default interface IActivity {
    name: string;
    icon: string;
    component: typeof React.Component
}