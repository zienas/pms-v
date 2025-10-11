import React from 'react';

const ShipIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" {...props}>
        <path d="M2 13.5V7h1v6.5a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5V7h1v6.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5zm0-11V6h12V2.5a.5.5 0 0 0-.5-.5h-11a.5.5 0 0 0-.5.5zM12 2h1v2h-1V2zm-2 0h1v2h-1V2zM7 2h1v2H7V2zM5 2h1v2H5V2z"/>
        <path d="M2 7h12v1H2V7z"/>
    </svg>
);

export default ShipIcon;