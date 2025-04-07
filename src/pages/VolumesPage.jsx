import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { FaPlus, FaEdit, FaTrash, FaSync, FaDatabase, FaCheck, FaTimes } from 'react-icons/fa';
import toast from 'react-hot-toast';
import api from '../services/api';
import VolumeModal from '../components/VolumeModal';

const VolumesPage = () => {
    const queryClient = useQueryClient();
    const [selectedVolume, setSelectedVolume] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Fetch volumes
    const {data: volumes, isLoading} = useQuery('volumes', api.getVolumes, {
        refetchOnWindowFocus: false,
    });

    // Define Volume interface
    interface Volume {
        id: string | number;
        name: string;
        physical_path: string;
        type: string;
        is_active: boolean;
    }

    // Delete volume mutation
    const deleteMutation = useMutation(
        (id: string | number) => api.deleteVolume(id),
        {
            onSuccess: () => {
                queryClient.invalidateQueries('volumes');
                toast.success('Volume deleted successfully');
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.error || 'Failed to delete volume');
            },
        }
    );

    // Scan volume mutation
    const scanMutation = useMutation(
        (id: string | number) => api.scanVolume(id),
        {
            onSuccess: (data) => {
                queryClient.invalidateQueries('volumes');
                queryClient.invalidateQueries('samples');
                toast.success(`Scan completed: ${data.results.newFiles} new files found`);
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.error || 'Failed to scan volume');
            },
        }
    );

    // Handle delete volume
    const handleDeleteVolume = async (id: string | number) => {
        if (window.confirm('Are you sure you want to delete this volume?')) {
            deleteMutation.mutate(id);
        }
    };

    // Handle scan volume
    const handleScanVolume = (id: string | number) => {
        scanMutation.mutate(id);
    };

    // Handle edit volume
    const handleEditVolume = (volume: Volume) => {
        setSelectedVolume(volume);
        setIsModalOpen(true);
    };

    // Handle create new volume
    const handleCreateVolume = () => {
        setSelectedVolume(null);
        setIsModalOpen(true);
    };

    // Handle modal close
    const handleModalClose = (refresh = false) => {
        setIsModalOpen(false);
        setSelectedVolume(null);

        if (refresh) {
            queryClient.invalidateQueries('volumes');
        }
    };

    return (
        <div className="py-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Sample Volumes</h1>
                <button
                    onClick={handleCreateVolume}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
                >
                    <FaPlus className="mr-2"/>
                    New Volume
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {isLoading ? (
                    <div className="p-4 text-center">Loading...</div>
                ) : volumes?.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-gray-500 mb-4">No volumes found</p>
                        <button
                            onClick={handleCreateVolume}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                            Create your first volume
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Path
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                            {volumes?.map((volume: Volume) => (
                                <tr key={volume.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <FaDatabase className="text-indigo-600 mr-3"/>
                                            <div className="text-sm font-medium text-gray-900">{volume.name}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">{volume.physical_path}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">{volume.type}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              volume.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                          }`}
                      >
                        {volume.is_active ? (
                            <>
                                <FaCheck className="mr-1"/> Active
                            </>
                        ) : (
                            <>
                                <FaTimes className="mr-1"/> Inactive
                            </>
                        )}
                      </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end space-x-2">
                                            <button
                                                onClick={() => handleScanVolume(volume.id)}
                                                className="text-green-600 hover:text-green-900"
                                                disabled={scanMutation.isLoading}
                                                title="Scan for samples"
                                            >
                                                <FaSync className={scanMutation.isLoading ? 'animate-spin' : ''}/>
                                            </button>
                                            <button
                                                onClick={() => handleEditVolume(volume)}
                                                className="text-indigo-600 hover:text-indigo-900"
                                                title="Edit volume"
                                            >
                                                <FaEdit/>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteVolume(volume.id)}
                                                className="text-red-600 hover:text-red-900"
                                                title="Delete volume"
                                            >
                                                <FaTrash/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Volume Modal */}
            {isModalOpen && (
                <VolumeModal
                    volume={selectedVolume}
                    onClose={handleModalClose}
                />
            )}
        </div>
    );
}
