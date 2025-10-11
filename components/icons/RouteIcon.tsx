import React from 'react';

const RouteIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" {...props}>
        <path fillRule="evenodd" d="M7.293.707A1 1 0 0 0 6 1.414v1.586A1 1 0 0 0 7 4h4a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H7.586a1 1 0 0 0-.293-.707zM8 5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v1z"/>
        <path d="M8.5 5.5a.5.5 0 0 0-1 0V14.5a.5.5 0 0 0 1 0v-9z"/>
    </svg>
);

export default RouteIcon;