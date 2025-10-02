import React, { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { hashPassword, generatePasswordFromBirthDate } from '../../utils/auth';

interface StudentData {
  full_name: string;
  birth_date: string;
  phone?: string;
  address?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface ExcelImportProps {
  classId: string;
  onImportComplete: (successCount: number, errors: string[]) => void;
  onClose: () => void;
}

const ExcelImport: React.FC<ExcelImportProps> = ({ classId, onImportComplete, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<StudentData[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseExcelFile(selectedFile);
    }
  };

  const parseExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Get the first worksheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Skip header row and map to student data
        const students: StudentData[] = jsonData.slice(1)
          .filter((row: any[]) => row.length >= 2 && row[0] && row[1]) // Filter out empty rows
          .map((row: any[]) => ({
            full_name: String(row[0] || '').trim(),
            birth_date: String(row[1] || '').trim(),
            phone: row[2] ? String(row[2]).trim() : '',
            address: row[3] ? String(row[3]).trim() : ''
          }))
          .slice(0, 100); // Limit to 100 students per import

        setPreviewData(students);
        validateData(students);
      } catch (error) {
        console.error('Error parsing Excel file:', error);
        setValidation({
          isValid: false,
          errors: ['Format file Excel tidak valid'],
          warnings: []
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const validateData = (students: StudentData[]): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    students.forEach((student, index) => {
      const rowNum = index + 2; // +2 because we skip header and arrays are 0-indexed

      // Validate required fields
      if (!student.full_name) {
        errors.push(`Baris ${rowNum}: Nama lengkap harus diisi`);
      }

      if (!student.birth_date) {
        errors.push(`Baris ${rowNum}: Tanggal lahir harus diisi`);
      } else {
        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(student.birth_date)) {
          errors.push(`Baris ${rowNum}: Format tanggal lahir harus YYYY-MM-DD`);
        } else {
          const date = new Date(student.birth_date);
          if (isNaN(date.getTime())) {
            errors.push(`Baris ${rowNum}: Tanggal lahir tidak valid`);
          }
        }
      }

      // Validate phone if provided
      if (student.phone && !/^[\d\s\-\+\(\)]+$/.test(student.phone)) {
        warnings.push(`Baris ${rowNum}: Format nomor telepon mungkin tidak valid`);
      }

      // Check for reasonable name length
      if (student.full_name && student.full_name.length > 100) {
        errors.push(`Baris ${rowNum}: Nama lengkap terlalu panjang (maksimal 100 karakter)`);
      }
    });

    const result = {
      isValid: errors.length === 0,
      errors,
      warnings
    };

    setValidation(result);
    return result;
  };

  const downloadTemplate = () => {
    const template = [
      ['Nama Lengkap', 'Tanggal Lahir (YYYY-MM-DD)', 'No. Telepon (Opsional)', 'Alamat (Opsional)'],
      ['Ahmad Fauzi', '2005-03-15', '08123456789', 'Jl. Sudirman No. 123'],
      ['Siti Aminah', '2006-07-22', '08987654321', 'Jl. Thamrin No. 456']
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');

    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Nama Lengkap
      { wch: 20 }, // Tanggal Lahir
      { wch: 20 }, // No. Telepon
      { wch: 30 }  // Alamat
    ];

    XLSX.writeFile(wb, 'template_import_siswa.xlsx');
  };

  const handleImport = async () => {
    if (!validation?.isValid || previewData.length === 0) return;

    setImporting(true);
    let successCount = 0;
    const errors: string[] = [];

    try {
      // Import students in batches of 10 to avoid overwhelming the database
      const batchSize = 10;

      for (let i = 0; i < previewData.length; i += batchSize) {
        const batch = previewData.slice(i, i + batchSize);

        for (const student of batch) {
          try {
            // Generate student credentials (similar to manual creation)
            const { data: studentIdResult } = await supabase.rpc('generate_student_id');
            const { data: emailResult } = await supabase.rpc('generate_student_email', {
              student_name: student.full_name
            });

            const defaultPassword = generatePasswordFromBirthDate(student.birth_date);
            const hashedPassword = await hashPassword(defaultPassword);

            const { data: studentData, error } = await supabase
              .from('students')
              .insert({
                student_id: studentIdResult,
                email: emailResult,
                password: hashedPassword,
                full_name: student.full_name,
                birth_date: student.birth_date,
                phone: student.phone || null,
                address: student.address || null,
                created_by: (await supabase.auth.getUser()).data.user?.id
              })
              .select()
              .single();

            if (error) throw error;

            // Add student to class
            const { error: classError } = await supabase
              .from('students_classes')
              .insert({
                student_id: studentData.id,
                class_id: classId
              });

            if (classError) throw classError;

            successCount++;
          } catch (error: any) {
            errors.push(`${student.full_name}: ${error.message}`);
          }
        }
      }

      onImportComplete(successCount, errors);
    } catch (error: any) {
      console.error('Import error:', error);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Import Siswa dari Excel</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XCircle size={24} />
          </button>
        </div>

        {/* Upload Section */}
        <div className="mb-6">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />

            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet className="text-green-600" size={48} />
                <div className="text-left">
                  <p className="font-medium text-gray-800">{file.name}</p>
                  <p className="text-sm text-gray-600">
                    {(file.size / 1024).toFixed(1)} KB • {previewData.length} siswa ditemukan
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <Upload className="text-gray-400 mx-auto mb-4" size={48} />
                <p className="text-gray-600 mb-2">
                  Klik untuk memilih file Excel atau drag & drop
                </p>
                <p className="text-sm text-gray-500">
                  Format: .xlsx atau .xls (maksimal 100 siswa per import)
                </p>
              </div>
            )}

            {!file && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
              >
                Pilih File
              </button>
            )}
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={downloadTemplate}
              className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-2 mx-auto"
            >
              <Download size={16} />
              Download Template Excel
            </button>
          </div>
        </div>

        {/* Preview and Validation */}
        {previewData.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Preview Data ({previewData.length} siswa)</h3>

            {validation && (
              <div className="mb-4">
                {validation.errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
                      <XCircle size={16} />
                      Error ({validation.errors.length})
                    </div>
                    <ul className="text-sm text-red-700 space-y-1 max-h-32 overflow-y-auto">
                      {validation.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {validation.warnings.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 text-yellow-800 font-medium mb-2">
                      <AlertCircle size={16} />
                      Peringatan ({validation.warnings.length})
                    </div>
                    <ul className="text-sm text-yellow-700 space-y-1 max-h-32 overflow-y-auto">
                      {validation.warnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {validation.isValid && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-800 font-medium">
                      <CheckCircle size={16} />
                      Data siap untuk diimport
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Data Preview Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Nama Lengkap</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Tanggal Lahir</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">No. Telepon</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">Alamat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {previewData.slice(0, 10).map((student, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-800">{student.full_name}</td>
                        <td className="px-3 py-2 text-gray-800">{student.birth_date}</td>
                        <td className="px-3 py-2 text-gray-600">{student.phone || '-'}</td>
                        <td className="px-3 py-2 text-gray-600">{student.address || '-'}</td>
                      </tr>
                    ))}
                    {previewData.length > 10 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-2 text-center text-gray-500 italic">
                          ... dan {previewData.length - 10} siswa lainnya
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Batal
          </button>

          {file && validation?.isValid && (
            <button
              onClick={handleImport}
              disabled={importing}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50"
            >
              {importing ? 'Mengimport...' : `Import ${previewData.length} Siswa`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExcelImport;