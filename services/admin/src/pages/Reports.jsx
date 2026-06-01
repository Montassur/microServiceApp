import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import './Reports.css';

function Reports() {
    const toast = useToast();
    const [reportType, setReportType] = useState('users');
    const [dateRange, setDateRange] = useState('7days');

    const reports = [
        { id: 1, name: 'User Activity Report', type: 'users', icon: '👥', description: 'Detailed user engagement metrics' },
        { id: 2, name: 'Revenue Report', type: 'revenue', icon: '💰', description: 'Financial performance overview' },
        { id: 3, name: 'Traffic Report', type: 'traffic', icon: '📊', description: 'Website traffic analytics' },
        { id: 4, name: 'Performance Report', type: 'performance', icon: '⚡', description: 'System performance metrics' },
    ];

    const recentReports = [
        { id: 1, name: 'Monthly User Report', date: '2025-12-01', status: 'Completed', size: '2.4 MB' },
        { id: 2, name: 'Revenue Analysis Q4', date: '2025-11-28', status: 'Completed', size: '1.8 MB' },
        { id: 3, name: 'Traffic Summary', date: '2025-11-25', status: 'Completed', size: '3.2 MB' },
    ];

    const handleExport = (format) => {
        toast.success(`Exporting report as ${format.toUpperCase()}...`);
        setTimeout(() => {
            toast.success(`Report exported successfully!`);
        }, 2000);
    };

    const handleGenerate = () => {
        toast.info('Generating report...');
        setTimeout(() => {
            toast.success('Report generated successfully!');
        }, 2000);
    };

    const handleSchedule = () => {
        toast.success('Report scheduled successfully!');
    };

    return (
        <div className="reports-page">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1>Reports</h1>
                    <p className="page-subtitle">Generate and export detailed analytics reports</p>
                </div>
                <button className="btn btn-primary" onClick={handleGenerate}>
                    ⚡ Generate Report
                </button>
            </div>

            {/* Filters Section */}
            <div className="card">
                <h3>Report Configuration</h3>
                <div className="filters-grid">
                    <div className="form-group">
                        <label>Report Type</label>
                        <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
                            <option value="users">User Activity</option>
                            <option value="revenue">Revenue</option>
                            <option value="traffic">Traffic</option>
                            <option value="performance">Performance</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Date Range</label>
                        <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                            <option value="today">Today</option>
                            <option value="7days">Last 7 Days</option>
                            <option value="30days">Last 30 Days</option>
                            <option value="90days">Last 90 Days</option>
                            <option value="custom">Custom Range</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Group By</label>
                        <select>
                            <option value="day">Day</option>
                            <option value="week">Week</option>
                            <option value="month">Month</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Report Types Grid */}
            <div className="reports-grid">
                {reports.map(report => (
                    <div key={report.id} className="report-card">
                        <div className="report-icon">{report.icon}</div>
                        <div className="report-content">
                            <h4>{report.name}</h4>
                            <p>{report.description}</p>
                        </div>
                        <button
                            className="btn btn-sm"
                            onClick={() => {
                                setReportType(report.type);
                                handleGenerate();
                            }}
                        >
                            Generate →
                        </button>
                    </div>
                ))}
            </div>

            {/* Export Options */}
            <div className="card">
                <h3>Export Options</h3>
                <div className="export-buttons">
                    <button className="export-btn" onClick={() => handleExport('pdf')}>
                        <span className="export-icon">📄</span>
                        <span className="export-label">Export as PDF</span>
                    </button>
                    <button className="export-btn" onClick={() => handleExport('csv')}>
                        <span className="export-icon">📊</span>
                        <span className="export-label">Export as CSV</span>
                    </button>
                    <button className="export-btn" onClick={() => handleExport('excel')}>
                        <span className="export-icon">📗</span>
                        <span className="export-label">Export as Excel</span>
                    </button>
                    <button className="export-btn" onClick={handleSchedule}>
                        <span className="export-icon">⏰</span>
                        <span className="export-label">Schedule Report</span>
                    </button>
                </div>
            </div>

            {/* Recent Reports */}
            <div className="card">
                <div className="card-header">
                    <h3>Recent Reports</h3>
                    <button className="btn btn-sm">View All →</button>
                </div>
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Report Name</th>
                                <th>Generated</th>
                                <th>Status</th>
                                <th>Size</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentReports.map(report => (
                                <tr key={report.id}>
                                    <td className="report-name-cell">
                                        <span className="report-file-icon">📄</span>
                                        {report.name}
                                    </td>
                                    <td className="text-secondary">{report.date}</td>
                                    <td>
                                        <span className="status-badge status-active">{report.status}</span>
                                    </td>
                                    <td className="text-secondary">{report.size}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                className="btn-icon"
                                                title="Download"
                                                onClick={() => toast.success('Downloading report...')}
                                            >
                                                ⬇️
                                            </button>
                                            <button
                                                className="btn-icon"
                                                title="Share"
                                                onClick={() => toast.success('Share link copied!')}
                                            >
                                                🔗
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Reports;
