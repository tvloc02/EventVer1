import api from './api';

class FileService {
    async uploadFile(file, folder = 'general') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);

        const response = await api.post('/files/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }

    async uploadMultipleFiles(files, folder = 'general') {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });
        formData.append('folder', folder);

        const response = await api.post('/files/upload-multiple', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }

    async deleteFile(fileId) {
        const response = await api.delete(`/files/${fileId}`);
        return response.data;
    }

    async getFileInfo(fileId) {
        const response = await api.get(`/files/${fileId}/info`);
        return response.data;
    }

    async downloadFile(fileId) {
        const response = await api.get(`/files/${fileId}/download`, {
            responseType: 'blob'
        });
        return response.data;
    }

    async getFilesByFolder(folder) {
        const response = await api.get(`/files/folder/${folder}`);
        return response.data;
    }

    async resizeImage(fileId, width, height) {
        const response = await api.post(`/files/${fileId}/resize`, {
            width,
            height
        });
        return response.data;
    }
}

export const fileService = new FileService();