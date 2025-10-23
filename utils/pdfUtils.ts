import jsPDF from 'jspdf';
import type { Port } from '../types';

// This is a base64 encoded PNG of the application's ship icon,
// used as a fallback for PDF exports when a port-specific logo is not available.
// This is explicitly PNG to avoid issues with SVG rendering in jsPDF.
export const DEFAULT_APP_LOGO_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAG1SURBVHhe7Zq/S0RRHMe/M2e6sM1gMPhRBBsFDWyzmG8gaCtoaK/yR7DoB7BrL3/A0tYiWChYCFgE/Av+JKgJJJiE+fcy7yZP/TfcuTfnYq6eew4P53zPu3Nnzt0x04iICEmkQGqQChw5hQ/gQ7wCHqAFnaAB9H/U8B9cg/d3D1GvH3Y8gRcwB2J5AB2wB/qgA/gK7OAFfB6hYALoBTkQyQk0QALsgI+A30OELAC/4AsQEAEaIAG2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFCFgA+vS8QEAGaIAN2wEfA7yFC-l4+yEAAAAASUVORK5CYII=';

export const addHeaderWithLogo = (doc: jsPDF, port: Port, title: string) => {
    const marginLeft = 14;
    let titleX = marginLeft;
    let logoAdded = false;

    // Helper to extract MIME type from data URL
    const getMimeType = (dataUrl: string): string | null => {
        const match = dataUrl.match(/^data:image\/([a-zA-Z+]+);base64,/);
        return match ? match[1].toUpperCase() : null;
    };

    const customLogo = port.logoImage;
    const customLogoFormat = customLogo ? getMimeType(customLogo) : null;
    const isCustomLogoValid = customLogo && customLogoFormat && ['PNG', 'JPEG', 'JPG', 'WEBP'].includes(customLogoFormat);

    if (isCustomLogoValid) {
        try {
            doc.addImage(customLogo!, customLogoFormat!, marginLeft, 15, 20, 20);
            logoAdded = true;
        } catch (e) {
            console.warn('Failed to add custom port logo. It might be corrupt. Falling back.', e);
        }
    }

    if (!logoAdded) {
        try {
            // Use the guaranteed PNG fallback
            doc.addImage(DEFAULT_APP_LOGO_PNG, 'PNG', marginLeft, 15, 20, 20);
            logoAdded = true;
        } catch (e) {
            console.error('CRITICAL: Failed to add default logo. Proceeding without logo.', e);
        }
    }
    
    if (logoAdded) {
        titleX += 25; // 20px logo width + 5px padding
    }
    
    // -- Draw Title & Subtitle --
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40);
    doc.text(title, titleX, 22);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Port: ${port.name}`, titleX, 30);
    
    // -- Draw Generated Date --
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, doc.internal.pageSize.getWidth() - marginLeft, 30, { align: 'right' });
};

export default addHeaderWithLogo;
