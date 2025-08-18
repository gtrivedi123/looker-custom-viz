import React, { useState, useEffect, useContext } from 'react';

// This is the main application component.
// It is wrapped in the <ExtensionProvider40> which gives it access to the Looker SDK.
const App = () => {
  // Use a fallback to ensure the context is available
  const { coreSDK } = useContext(window.LookerExtensionSDK.ExtensionContext40) || {};

  // === STATE MANAGEMENT ===
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [reportData, setReportData] = useState([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [reportDownloadError, setReportDownloadError] = useState('');
  
  // Define available report types. This should correspond to your
  // LookML views that extend the single table.
  const reportTypes = [
    // NOTE: Updated with specific fields for each report
    { id: 'sales_report', label: 'Sales Report', explore: 'your_explore_name', view: 'sales_view', fields: ['sales_view.sale_date', 'sales_view.region', 'sales_view.total_sales'] },
    { id: 'inventory_report', label: 'Inventory Report', explore: 'your_explore_name', view: 'inventory_view', fields: ['inventory_view.product_name', 'inventory_view.stock_level', 'inventory_view.reorder_status'] },
    // Add more report types as needed
  ];
  const [selectedReport, setSelectedReport] = useState(reportTypes[0]);

  // === FILE UPLOAD LOGIC ===
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage('');
  };

  const handleFileUpload = async () => {
    if (!file) {
      setMessage('Please select an Excel file to upload.');
      return;
    }

    setLoading(true);
    setMessage('Uploading file and processing...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('report_type', selectedReport.id);

    try {
      // NOTE: Replace this with your actual backend service URL.
      // This service will be a Cloud Function or Cloud Run endpoint.
      const backendServiceUrl = 'https://your-backend-service-url';
      
      const response = await fetch(backendServiceUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setMessage(result.message || 'File uploaded and processed successfully!');

    } catch (error) {
      console.error('Upload failed:', error);
      setMessage(`Upload failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // === REPORT FETCHING LOGIC ===
  const fetchReportData = async (reportId) => {
    setLoading(true);
    setReportData([]);
    setMessage(`Fetching ${reportId}...`);
    
    // Find the selected report configuration
    const reportConfig = reportTypes.find(report => report.id === reportId);
    if (!reportConfig) {
      setMessage(`Error: Report configuration for '${reportId}' not found.`);
      setLoading(false);
      return;
    }

    try {
      // Use the Looker SDK to run a query.
      // The `model` and `explore` should be defined in your LookML project.
      const queryBody = {
        model: 'your_lookml_model_name', // NOTE: Replace with your model name
        view: reportConfig.view, // This is the view that extends the base view
        fields: reportConfig.fields, // Use the specific fields from the report configuration
        limit: '50', // Set an appropriate limit
      };
      
      if (!coreSDK) {
        throw new Error("Looker SDK is not available.");
      }

      const queryResult = await coreSDK.run_inline_query({
        result_format: 'json',
        body: queryBody
      });
      
      if (queryResult.ok) {
        setReportData(queryResult.value);
        setMessage(`Report '${reportConfig.label}' loaded successfully.`);
      } else {
        throw new Error(queryResult.error?.message || 'Failed to fetch report from Looker.');
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
      setMessage(`Failed to fetch report: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch data for the initial report when the component mounts
  useEffect(() => {
    if (coreSDK) {
      fetchReportData(selectedReport.id);
    }
  }, [selectedReport, coreSDK]);

  // === REPORT DOWNLOAD LOGIC ===
  const downloadReport = () => {
    if (reportData.length === 0) {
      setReportDownloadError('No data to download.');
      setModalOpen(true);
      return;
    }

    try {
      // Generate a CSV string from the report data
      const headers = Object.keys(reportData[0]);
      const csvContent = [
        headers.join(','),
        ...reportData.map(row => headers.map(header => {
          // Wrap values in double quotes if they contain commas or newlines
          const value = row[header] === null ? '' : String(row[header]);
          return `"${value.replace(/"/g, '""')}"`;
        }).join(','))
      ].join('\n');

      // Create a Blob and a download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `${selectedReport.label.replace(/\s/g, '_')}_report.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setReportDownloadError('');

    } catch (error) {
      console.error('Download failed:', error);
      setReportDownloadError('Failed to generate CSV for download.');
      setModalOpen(true);
    }
  };

  return (
    <window.LookerComponents.ComponentsProvider>
      <div className="flex flex-col min-h-screen p-8 bg-gray-50 text-gray-800">
        <window.LookerComponents.Card className="flex-1 w-full max-w-4xl mx-auto rounded-xl shadow-lg p-6 space-y-8">
          <window.LookerComponents.CardContent className="space-y-6">
            <window.LookerComponents.Heading as="h1" className="text-3xl font-bold text-center text-blue-800">
              Report Management
            </window.LookerComponents.Heading>
            
            <div className="space-y-4">
              <window.LookerComponents.Text className="text-lg font-medium">1. Excel File Upload</window.LookerComponents.Text>
              <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <input
                  type="file"
                  accept=".xls,.xlsx"
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
                  {loading ? 'Processing...' : 'Upload & Process'}
                </window.LookerComponents.Button>
              </div>
            </div>

            <div className="space-y-4">
              <window.LookerComponents.Text className="text-lg font-medium">2. Select & View Report</window.LookerComponents.Text>
              <div className="flex flex-wrap gap-2">
                {reportTypes.map((report) => (
                  <window.LookerComponents.Chip
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className={`cursor-pointer transition-colors duration-200
                      ${selectedReport.id === report.id
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-gray-200 text-gray-700'
                      }`}
                  >
                    {report.label}
                  </window.LookerComponents.Chip>
                ))}
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
            
            {/* Report Data Table */}
            {reportData.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <window.LookerComponents.Table className="min-w-full divide-y divide-gray-200">
                  <window.LookerComponents.TableHead className="bg-gray-100">
                    <window.LookerComponents.TableRow>
                      {Object.keys(reportData[0]).map(key => (
                        <window.LookerComponents.TableHeaderCell key={key} className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                          {key.split('.').pop().replace(/_/g, ' ')}
                        </window.LookerComponents.TableHeaderCell>
                      ))}
                    </window.LookerComponents.TableRow>
                  </window.LookerComponents.TableHead>
                  <window.LookerComponents.TableBody className="bg-white divide-y divide-gray-200">
                    {reportData.map((row, index) => (
                      <window.LookerComponents.TableRow key={index} className="hover:bg-gray-50">
                        {Object.values(row).map((value, idx) => (
                          <window.LookerComponents.TableCell key={idx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {value === null ? 'N/A' : value}
                          </window.LookerComponents.TableCell>
                        ))}
                      </window.LookerComponents.TableRow>
                    ))}
                  </window.LookerComponents.TableBody>
                </window.LookerComponents.Table>
              </div>
            )}

            {/* Download Button */}
            <div className="flex justify-end">
              <window.LookerComponents.Button onClick={downloadReport} className="rounded-full font-medium">
                Download Report
              </window.LookerComponents.Button>
            </div>

          </window.LookerComponents.CardContent>
        </window.LookerComponents.Card>
      </div>

      {/* Modal for errors */}
      <window.LookerComponents.Modal isOpen={isModalOpen} onClose={() => setModalOpen(false)}>
        <window.LookerComponents.Dialog>
          <window.LookerComponents.DialogContent>
            <window.LookerComponents.Heading as="h3">Download Error</window.LookerComponents.Heading>
            <window.LookerComponents.Text className="mt-4">{reportDownloadError}</window.LookerComponents.Text>
          </window.LookerComponents.DialogContent>
          <window.LookerComponents.ModalFooter>
            <window.LookerComponents.ButtonTransparent onClick={() => setModalOpen(false)}>Close</window.LookerComponents.ButtonTransparent>
          </window.LookerComponents.ModalFooter>
        </window.LookerComponents.Dialog>
      </window.LookerComponents.Modal>

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
