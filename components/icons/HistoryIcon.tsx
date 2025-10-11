import React from 'react';

const HistoryIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" {...props}>
        <path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022l-.074.997zM5.898 1.58C5.334 1.888 4.82 2.296 4.382 2.768L3.62 1.95A7.968 7.968 0 0 1 5.898 1.58zM3.16 3.16a8.025 8.025 0 0 1-.843 1.288L1.58 3.62a7.96 7.96 0 0 1 1.95-1.254l.63 1.793zM1.58 5.898c-.308.564-.516 1.18-.635 1.834L0 7.647a8.003 8.003 0 0 1 .997-.074l.142.923zM8.5 4.5a.5.5 0 0 0-1 0v5.732l-2.66-1.55a.5.5 0 1 0-.52.866l3 1.75a.5.5 0 0 0 .52 0l3-1.75a.5.5 0 1 0-.52-.866L8.5 10.232V4.5z"/>
        <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
    </svg>
);

export default HistoryIcon;