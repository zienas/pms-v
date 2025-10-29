import React from 'react';
import { usePort } from '../context/PortContext';
import CloseIcon from './icons/CloseIcon';
import { toast } from 'react-hot-toast';
import SparkleIcon from './icons/SparkleIcon';

const GeneratePromptModal: React.FC = () => {
    const { state, actions } = usePort();
    const { modal } = state;
    const { closeModal } = actions;

    if (modal?.type !== 'generatePrompt') {
        return null;
    }
    
    const { title, prompt } = modal;

    const handleCopy = () => {
        navigator.clipboard.writeText(prompt)
            .then(() => {
                toast.success('Prompt copied to clipboard!');
            })
            .catch(err => {
                toast.error('Failed to copy prompt.');
                console.error('Failed to copy text: ', err);
            });
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl border border-gray-700 max-h-full flex flex-col">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <SparkleIcon className="w-6 h-6 text-cyan-400" />
                        <h2 className="text-2xl font-bold text-white">{title}</h2>
                    </div>
                    <button onClick={closeModal} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white" aria-label="Close">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <p className="text-sm text-gray-400 mb-4">
                    This is a generated prompt based on the current application data. You can copy this prompt and use it with a generative AI model like Gemini to get insights, summaries, or draft reports.
                </p>

                <textarea
                    readOnly
                    value={prompt}
                    className="w-full flex-1 p-3 bg-gray-900/50 border border-gray-600 rounded-md text-gray-300 font-mono text-sm resize-none focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    rows={12}
                />

                <div className="flex justify-end gap-4 pt-4 mt-4 border-t border-gray-700">
                    <button onClick={closeModal} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">Close</button>
                    <button onClick={handleCopy} className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700">Copy to Clipboard</button>
                </div>
            </div>
        </div>
    );
};

export default GeneratePromptModal;
