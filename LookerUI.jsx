import React, { useState } from 'react';
import {
  Button,
  Card,
  CardContent,
  ComponentsProvider,
  Heading,
  Text,
  Spinner,
} from '@looker/components';
import {
  ExtensionProvider40,
} from '@looker/extension-sdk-react';

// This is the main application component.
// It is wrapped in the <ExtensionProvider40> which gives it access to the Looker SDK.
const App = () => {
  // === STATE MANAGEMENT ===
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  
  // === FILE UPLOAD LOGIC ===
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage('');
  };

  const handleFileUpload = async () => {
    if (!file) {
      setMessage('Please select a file to upload.');
      return;
    }

    setLoading(true);
    setMessage('Uploading file to Google Cloud Storage...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      // NOTE: Replace this with your actual backend service URL.
      // This service will handle the upload to your GCS bucket.
      const uploadServiceUrl = 'https://your-upload-service-url';
      
      const response = await fetch(uploadServiceUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setMessage(result.message || 'File uploaded successfully!');

    } catch (error) {
      console.error('Upload failed:', error);
      setMessage(`Upload failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // === FILE DOWNLOAD LOGIC ===
  const handleFileDownload = () => {
    // NOTE: You need to specify the file name or a way to retrieve the correct URL.
    // This is a simple example assuming a fixed or known URL.
    const fileName = "example_report.xlsx";
    
    // NOTE: Replace with the public URL or a signed URL for your file in GCS.
    // For a real application, you would call a backend service to get a secure
    // signed URL for a specific file, or use a public URL.
    const gcsFileUrl = `https://storage.googleapis.com/your-bucket-name/${fileName}`;
    
    // Create a temporary link to trigger the download
    const link = document.createElement('a');
    link.href = gcsFileUrl;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <ComponentsProvider>
      <div className="flex flex-col min-h-screen p-8 bg-gray-50 text-gray-800">
        <Card className="flex-1 w-full max-w-4xl mx-auto rounded-xl shadow-lg p-6 space-y-8">
          <CardContent className="space-y-6">
            <Heading as="h1" className="text-3xl font-bold text-center text-blue-800">
              File Management
            </Heading>
            
            <div className="space-y-4">
              <Text className="text-lg font-medium">1. File Upload</Text>
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="flex-grow w-full sm:w-auto text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
                <Button 
                  onClick={handleFileUpload}
                  disabled={!file || loading}
                  className="w-full sm:w-auto rounded-full font-medium"
                >
                  {loading ? 'Uploading...' : 'Upload to Bucket'}
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <Text className="text-lg font-medium">2. File Download</Text>
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <Button 
                  onClick={handleFileDownload}
                  className="w-full sm:w-auto rounded-full font-medium bg-green-500 hover:bg-green-600 text-white"
                >
                  Download from Bucket
                </Button>
              </div>
            </div>
            
            {/* Show message or spinner */}
            {message && (
              <div className="flex items-center space-x-2">
                <Text className={`font-medium ${loading ? 'text-blue-500' : 'text-green-600'}`}>
                  {message}
                </Text>
                {loading && <Spinner size={20} />}
              </div>
            )}
            
          </CardContent>
        </Card>
      </div>
    </ComponentsProvider>
  );
};

// This is the entry point for the extension.
// It uses the ExtensionProvider40 to connect to the Looker host.
export default function AppWrapper() {
  return (
    <ExtensionProvider40>
      <App />
    </ExtensionProvider40>
  );
}
