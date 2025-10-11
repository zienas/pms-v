import React from 'react';

const DashboardIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" {...props}>
        <path d="M8 4a.5.5 0 0 1 .5.5V6a.5.5 0 0 1-1 0V4.5A.5.5 0 0 1 8 4zm3.732 1.732a.5.5 0 0 1 .707 0l.915.914a.5.5 0 1 1-.708.708l-.914-.915a.5.5 0 0 1 0-.707zM2 10a.5.5 0 0 1 .5-.5h1.586a.5.5 0 0 1 0 1H2.5A.5.5 0 0 1 2 10zm9.5 0a.5.5 0 0 1 .5-.5h1.5a.5.5 0 0 1 0 1H12a.5.5 0 0 1-.5-.5zm.754-4.246a.5.5 0 0 1 0 .708l-.914.915a.5.5 0 1 1-.707-.708l.914-.914a.5.5 0 0 1 .708 0z"/>
        <path d="M4 11a4 4 0 1 1 8 0v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-1zm1 0a3 3 0 1 0 6 0v-1a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v1z"/>
        <path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm-1-2a1 1 0 1 1 2 0 1 1 0 0 1-2 0z"/>
    </svg>
);

export default DashboardIcon;