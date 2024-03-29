// react
import { useState, useCallback, useEffect, useRef } from 'react';
// axios
import axiosInstance from '../../config/axios-instance';
// mui
import { DataGrid } from '@mui/x-data-grid';
import { Button, TextField, Paper } from '@mui/material';
// others
import ActionMenu from '../../custom/CustomActionMenu.jsx';
import { statusColors } from '../../utils/statusColor.js';
import StatusCell from '../StatusCell.jsx';
import { formatYearFromDate } from '../../utils/formatDateFromYear.js';
import CustomGridToolbar from '../CustomGridToolbar.jsx';
import CustomSnackbar from '../../custom/CustomSnackbar.jsx';
import exportDataToExcel from '../../utils/exportToExcel.js';
import dengueHeaderMappings from '../../constant/dengueHeaderMapping.js';
import ConfirmationDialog from '../../custom/CustomConfirmDialog.jsx';
import RecordInfoDialog from '../../components/Dialog/dengueInfoDialog.jsx';
import DengueMonitoringForm from '../Form/DengueMonitoringForm.jsx';
import useDengueReport from '../report/useDengueReport.jsx';
import { useSchoolYear } from '../../hooks/useSchoolYear.js';

const DengueMonitoringGrid = () => {
  const [formOpen, setFormOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [records, setRecords] = useState([]);
  const [searchValue, setSearchValue] = useState('');
  const [selectedRows, setSelectedRows] = useState([]);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [onConfirm, setOnConfirm] = useState(() => {});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isInfoDialogOpen, setInfoDialogOpen] = useState(false);
  const [selectedRecordInfo, setSelectedRecordInfo] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarData, setSnackbarData] = useState({
    message: '',
    severity: 'success',
  });
  const dataGridRef = useRef(null);
  const [filterModel, setFilterModel] = useState({
    items: [],
  });
  const { generatePdfDocument } = useDengueReport();
  const { activeSchoolYear } = useSchoolYear();

  const handleGenerateReport = () => {
    generatePdfDocument();
  };

  const showSnackbar = (message, severity) => {
    setSnackbarData({ message, severity });
    setSnackbarOpen(true);
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const handleSearchChange = (event) => {
    setSearchValue(event.target.value);
  };

  const handleDialogOpen = (recordId, isBulk = false) => {
    setConfirmMessage(
      isBulk
        ? 'Warning: This action will permanently delete all selected records and cannot be undone. Are you absolutely sure you want to proceed?'
        : 'Warning: This action will permanently delete this record and cannot be undone. Are you absolutely sure you want to proceed?'
    );
    setOnConfirm(
      () => () => (isBulk ? handleBulkDelete() : handleDelete(recordId))
    );
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
  };

  const mapRecord = (record) => {
    const academicYear = record.academicYear || {};

    const formattedName = `${record.lastName || ''}, ${record.firstName || ''}${
      record.middleName ? ` ${record.middleName.charAt(0)}` : ''
    }${record.nameExtension ? ` ${record.nameExtension}` : ''}`.trim();

    return {
      id: record._id,
      lrn: record.lrn || 'N/A',
      firstName: record.firstName || 'N/A',
      middleName: record.middleName || '',
      lastName: record.lastName || 'N/A',
      nameExtension: record.nameExtension || '',
      name: formattedName,
      schoolYear: academicYear.schoolYear || 'N/A',
      grade: record.grade || 'N/A',
      section: record.section || 'N/A',
      gender: record.gender || 'N/A',
      dateOfBirth: record.dateOfBirth || 'N/A',
      age: record.age || 'N/A',
      adviser: record.adviser || 'N/A',
      dateOfOnset: record.dateOfOnset || 'N/A',
      dateOfAdmission: record.dateOfAdmission
        ? formatYearFromDate(record.dateOfAdmission)
        : null,
      hospitalAdmission: record.hospitalAdmission || '',
      dateOfDischarge: record.dateOfDischarge
        ? formatYearFromDate(record.dateOfDischarge)
        : null,
      address: record.address || '',
      remarks: record.remarks || '',
      status: record.status || 'N/A',
    };
  };

  const fetchRecord = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await axiosInstance.get(
        `/dengueMonitoring/fetch?schoolYear=${encodeURIComponent(
          activeSchoolYear
        )}`
      );
      const updatedRecords = response.data.map(mapRecord);
      setRecords(updatedRecords);
    } catch (error) {
      console.error('An error occurred while fetching records:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeSchoolYear]);

  useEffect(() => {
    if (activeSchoolYear) {
      fetchRecord();
    }
  }, [activeSchoolYear, fetchRecord]);

  const refreshStudents = () => {
    fetchRecord();
  };

  const addNewRecord = (newRecord) => {
    const mappedRecord = mapRecord(newRecord);
    setRecords((prevRecords) => [...prevRecords, mappedRecord]);
  };

  const updatedStudentProfile = (updatedStudentData) => {
    const mappedRecord = mapRecord(updatedStudentData);
    setRecords((prevRecords) =>
      prevRecords.map((record) =>
        record.id === mappedRecord.id ? mappedRecord : record
      )
    );
  };

  const columns = [
    { field: 'lrn', headerName: 'LRN', width: 150 },
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'gender', headerName: 'Gender', width: 100 },
    {
      field: 'dateOfOnset',
      headerName: 'Date of Onset',
      width: 100,
      valueGetter: (params) => formatYearFromDate(params.row.dateOfOnset),
    },
    { field: 'age', headerName: 'Age', width: 75 },
    { field: 'schoolYear', headerName: 'S.Y', width: 100 },
    { field: 'grade', headerName: 'Grade', width: 100 },
    { field: 'section', headerName: 'Section', width: 100 },
    {
      field: 'status',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => (
        <StatusCell value={params.value} colorMapping={statusColors} />
      ),
    },
    {
      field: 'action',
      headerName: 'Action',
      width: 100,
      headerAlign: 'center',
      align: 'center',
      renderCell: (params) => (
        <ActionMenu
          onEdit={() => handleEdit(params.row.id)}
          onDelete={() => handleDialogOpen(params.row.id)}
          onView={() => handleInfoDialogOpen(params.row.id)}
        />
      ),
    },
  ];

  const handleInfoDialogOpen = (recordId) => {
    const recordInfo = records.find((record) => record.id === recordId);
    setSelectedRecordInfo(recordInfo);
    setInfoDialogOpen(true);
  };

  const handleInfoDialogClose = () => {
    setSelectedRecordInfo(null);
    setInfoDialogOpen(false);
  };

  const handleEdit = (recordId) => {
    const recordToEdit = records.find((record) => record.id === recordId);
    setSelectedRecord(recordToEdit);
    setFormOpen(true);
  };

  const handleDelete = async (recordId) => {
    try {
      await axiosInstance.delete(`dengueMonitoring/delete/${recordId}`);

      const updatedRecords = records.filter((record) => record.id !== recordId);
      setRecords(updatedRecords);
      showSnackbar('Dengue record successfully deleted.', 'success');
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        showSnackbar(`Delete Error: ${error.response.data.error}`, 'error');
      } else {
        showSnackbar(
          'Failed to delete the Dengue record. Please try again.',
          'error'
        );
      }
    }
    setSnackbarOpen(true); // Open the snackbar with the message
    handleDialogClose();
  };

  const handleBulkDelete = async () => {
    try {
      const recordIdsToDelete = selectedRows.map((row) => row.id);
      const response = await axiosInstance.delete(
        'dengueMonitoring/bulkDelete',
        {
          data: { ids: recordIdsToDelete },
        }
      );

      const updatedRecords = records.filter(
        (record) => !recordIdsToDelete.includes(record.id)
      );
      setRecords(updatedRecords);
      showSnackbar(response.data.message, 'success');
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        showSnackbar(`Delete Error: ${error.response.data.error}`, 'error');
      } else {
        showSnackbar(
          'Failed to delete the Records. Please try again.',
          'error'
        );
      }
    }
    setSnackbarOpen(true);
    handleDialogClose();
  };

  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) {
      showSnackbar('No file selected', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5 MB size limit
      showSnackbar('File size exceeds 5MB', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsLoading(true); // Start the loading spinner

    try {
      const response = await axiosInstance.post(
        '/dengueMonitoring/import',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      if (response.data.errorCount && response.data.errorCount > 0) {
        // Show detailed error messages if available
        showSnackbar({
          message: `Import completed with some issues: ${response.data.detailedErrors}`,
          severity: 'warning',
        });
      } else {
        showSnackbar('Data imported successfully!', 'success');
        refreshStudents(); // Refresh or update the data grid
      }
    } catch (error) {
      console.error('API error:', error);
      let errorMessage = 'An error occurred during importing';
      if (error.response && error.response.data) {
        // Check for structured error response
        if (error.response.data.detailedErrors) {
          errorMessage = `Import failed: ${error.response.data.detailedErrors}`;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      }
      showSnackbar(errorMessage, 'error');
    } finally {
      setIsLoading(false); // Stop the loading spinner
    }
  };

  const handleExport = () => {
    const activeFilterModel = filterModel;

    const filteredData = records.filter((record) => {
      return activeFilterModel.items.every((filterItem) => {
        if (!filterItem.field) {
          return true;
        }

        let cellValue = (record[filterItem.field] ?? '')
          .toString()
          .toLowerCase()
          .trim();

        const filterValues = Array.isArray(filterItem.value)
          ? filterItem.value.map((val) => val.toString().toLowerCase().trim())
          : [filterItem.value.toString().toLowerCase().trim()];

        switch (filterItem.operator) {
          case 'equals':
            return cellValue === filterValues[0];
          case 'contains':
            return filterValues.some((value) => cellValue.includes(value));
          case 'startsWith':
            return filterValues.some((value) => cellValue.startsWith(value));
          case 'endsWith':
            return filterValues.some((value) => cellValue.endsWith(value));
          case 'isAnyOf':
            return filterValues.includes(cellValue);
          default:
            console.log(
              `Unknown filter type '${filterItem.operator}', record included by default`
            );
            return true;
        }
      });
    });

    // Define excelHeaders based on the fields in transformedRecord
    const excelHeaders = Object.keys(records[0] || {})
      .filter((key) => key !== 'id') // This will exclude the 'id' field
      .map((key) => ({
        title: dengueHeaderMappings[key] || key,
        key: key,
      }));

    exportDataToExcel(filteredData, excelHeaders, 'DengueMonitoring', {
      dateFields: [
        'dateOfBirth',
        'dateOfOnset',
        'dateOfAdmission',
        'dateOfDischarge',
      ], // adjust based on transformed data
      excludeColumns: [
        'action',
        'firstName',
        'lastName',
        'middleName',
        'nameExtension',
      ], // adjust based on transformed data
    });
  };

  const handleModalOpen = () => {
    setFormOpen(true);
  };

  const handleModalClose = () => {
    setFormOpen(false);
  };

  const filteredRecords = records.filter((record) =>
    Object.keys(record).some((key) => {
      const value = record[key]?.toString().toLowerCase();
      return value?.includes(searchValue.toLowerCase());
    })
  );
  return (
    <>
      <CustomSnackbar
        open={snackbarOpen}
        handleClose={handleCloseSnackbar}
        severity={snackbarData.severity}
        message={snackbarData.message}
      />
      <RecordInfoDialog
        open={isInfoDialogOpen}
        onClose={handleInfoDialogClose}
        record={selectedRecordInfo}
      />
      <div className="flex flex-col h-full">
        <div className="w-full max-w-screen-xl mx-auto px-8">
          <div className="mb-4 flex justify-between items-center">
            <div className="flex">
              <Button
                variant="contained"
                color="primary"
                onClick={handleGenerateReport}
              >
                GENERATE REPORT
              </Button>
              <div className="ml-2">
                <a
                  href="/template/DengueMonitoring_Template.xlsx"
                  download
                  style={{ textDecoration: 'none' }}
                >
                  <Button variant="contained" color="primary">
                    Download Template
                  </Button>
                </a>
              </div>
            </div>
            <div className="flex items-center">
              <Button
                variant="contained"
                color="primary"
                onClick={handleModalOpen}
              >
                New Record
              </Button>
              <div className="ml-2">
                <TextField
                  label="Search"
                  variant="outlined"
                  size="small"
                  value={searchValue}
                  onChange={handleSearchChange}
                />
              </div>
            </div>
          </div>
          <Paper elevation={5} className="flex-grow">
            <DataGrid
              ref={dataGridRef}
              rows={filteredRecords}
              columns={columns}
              onFilterModelChange={(newModel) => setFilterModel(newModel)}
              getRowId={(row) => row.id}
              initialState={{
                pagination: {
                  paginationModel: {
                    pageSize: 10,
                  },
                },
              }}
              slots={{
                toolbar: () => (
                  <CustomGridToolbar
                    onExport={handleExport}
                    handleImport={handleImport}
                    selectedRows={selectedRows}
                    handleBulkDelete={() => handleDialogOpen(null, true)}
                  />
                ),
              }}
              onRowSelectionModelChange={(newSelection) => {
                const selectedRowsData = filteredRecords.filter((row) =>
                  newSelection.includes(row.id)
                );
                setSelectedRows(selectedRowsData);
              }}
              sx={{
                '& .MuiDataGrid-row:nth-of-type(odd)': {
                  backgroundColor: '#f3f4f6',
                },
              }}
              pageSizeOptions={[10]}
              disableSelectionOnClick
              checkboxSelection
              loading={isLoading}
              style={{ height: 650 }}
            />
          </Paper>
        </div>
      </div>
      <DengueMonitoringForm
        open={formOpen}
        addNewRecord={addNewRecord}
        onUpdate={updatedStudentProfile}
        selectedRecord={selectedRecord}
        onClose={() => {
          setSelectedRecord(null);
          handleModalClose();
        }}
        onCancel={() => {
          setSelectedRecord(null);
          handleModalClose();
        }}
      />
      {onConfirm && (
        <ConfirmationDialog
          open={dialogOpen}
          onClose={handleDialogClose}
          onConfirm={onConfirm}
          title="Confirm Delete!"
          message={confirmMessage}
        />
      )}
    </>
  );
};

export default DengueMonitoringGrid;
