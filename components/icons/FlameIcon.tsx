import React from 'react';

// FIX: Update component to accept a `title` prop and render an accessible <title> element inside the SVG.
const FlameIcon = ({ title, ...props }: React.SVGProps<SVGSVGElement> & { title?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" {...props}>
        {title && <title>{title}</title>}
        <path d="M8 16c3.314 0 6-2 6-5.5 0-1.5-.5-4-2.5-6 .25 1.5-1.25 2-1.25 2C11 4 9 .5 6 0c.357 2 .5 4-2 6-1.25 1-2 2.729-2 4.5C2 14 4.686 16 8 16z"/>
    </svg>
);

export default FlameIcon;