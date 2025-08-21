import React, { useState } from 'react';

// This is the main application component.
// It is wrapped in the <ExtensionProvider40> which gives it access to the Looker SDK.
const App = () => {
  // === STATE MANAGEMENT ===
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
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
      const uploadServiceUrl = 'https://console.cloud.google.com/storage/browser/looker_upload;tab=objects?forceOnBucketsSortingFiltering=true&inv=1&invt=Ab550w&project=gc-proj-cdp-uat-07ae&supportedpurview=project&prefix=&forceOnObjectsSortingFiltering=false';
      
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
    const fileName = "test_report.xlsx";
    
    // Use the bucket you referenced.
    const gcsFileUrl = `https://console.cloud.google.com/storage/browser/looker_upload;tab=objects?forceOnBucketsSortingFiltering=true&inv=1&invt=Ab550w&project=gc-proj-cdp-uat-07ae&supportedpurview=project&prefix=&forceOnObjectsSortingFiltering=false`;
    
    // Create a temporary link to trigger the download
    const link = document.createElement('a');
    link.href = gcsFileUrl;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  return (
    <window.LookerComponents.ComponentsProvider>
      <div className="flex flex-col min-h-screen p-8 bg-gray-50 text-gray-800">
        <window.LookerComponents.Card className="flex-1 w-full max-w-4xl mx-auto rounded-xl shadow-lg p-6 space-y-8">
          <window.LookerComponents.CardContent className="space-y-6">
            <window.LookerComponents.Heading as="h1" className="text-3xl font-bold text-center text-blue-800">
              File Management
            </window.LookerComponents.Heading>
            
            <div className="space-y-4">
              <window.LookerComponents.Text className="text-lg font-medium">1. File Upload</window.LookerComponents.Text>
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
                <window.LookerComponents.Button 
                  onClick={handleFileUpload}
                  disabled={!file || loading}
                  className="w-full sm:w-auto rounded-full font-medium"
                >
                  {loading ? 'Uploading...' : 'Upload to Bucket'}
                </window.LookerComponents.Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <window.LookerComponents.Text className="text-lg font-medium">2. File Download</window.LookerComponents.Text>
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <window.LookerComponents.Button 
                  onClick={handleFileDownload}
                  className="w-full sm:w-auto rounded-full font-medium bg-green-500 hover:bg-green-600 text-white"
                >
                  Download from Bucket
                </window.LookerComponents.Button>
              </div>
            </div>
            
            {/* Show message or spinner */}
            {message && (
              <div className="flex items-center space-x-2">
                <window.LookerComponents.Text className={`font-medium ${loading ? 'text-blue-500' : 'text-green-600'}`}>
                  {message}
                </window.LookerComponents.Text>
                {loading && <window.LookerComponents.Spinner size={20} />}
              </div>
            )}
            
          </window.LookerComponents.CardContent>
        </window.LookerComponents.Card>
      </div>
    </window.LookerComponents.ComponentsProvider>
  );
};

// This is the entry point for the extension.
// It uses the ExtensionProvider40 to connect to the Looker host.
export default function AppWrapper() {
  return (
    <window.LookerExtensionSDK.ExtensionProvider40>
      <App />
    </window.LookerExtensionSDK.ExtensionProvider40>
  );
}
