import axios from 'axios';
import { 
  assetsAPI, 
  maintenanceAPI, 
  amcRenewalAPI, 
  repairsAPI,
  dashboardAPI 
} from '../../utils/api';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('API Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('assetsAPI', () => {
    describe('getAssets', () => {
      it('should fetch assets successfully', async () => {
        const mockData = {
          data: [
            { id: 1, equipment_name: 'Test Equipment', category: 'HVAC' }
          ],
          total: 1
        };
        mockedAxios.get.mockResolvedValue({ data: mockData });

        const result = await assetsAPI.getAssets();

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/assets');
        expect(result).toEqual(mockData);
      });

      it('should handle API errors', async () => {
        const mockError = new Error('Network Error');
        mockedAxios.get.mockRejectedValue(mockError);

        await expect(assetsAPI.getAssets()).rejects.toThrow('Network Error');
      });

      it('should pass query parameters correctly', async () => {
        const params = { page: 1, limit: 10, search: 'test' };
        mockedAxios.get.mockResolvedValue({ data: { data: [], total: 0 } });

        await assetsAPI.getAssets(params);

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/assets', { params });
      });
    });

    describe('createAsset', () => {
      it('should create asset successfully', async () => {
        const assetData = {
          equipment_name: 'New Equipment',
          category: 'HVAC',
          location: 'Mumbai'
        };
        const mockResponse = { data: { id: 1, ...assetData } };
        mockedAxios.post.mockResolvedValue(mockResponse);

        const result = await assetsAPI.createAsset(assetData);

        expect(mockedAxios.post).toHaveBeenCalledWith('/api/assets', assetData);
        expect(result).toEqual(mockResponse.data);
      });

      it('should handle validation errors', async () => {
        const assetData = { equipment_name: '' };
        const mockError = {
          response: {
            status: 400,
            data: { message: 'Equipment name is required' }
          }
        };
        mockedAxios.post.mockRejectedValue(mockError);

        await expect(assetsAPI.createAsset(assetData)).rejects.toEqual(mockError);
      });
    });

    describe('updateAsset', () => {
      it('should update asset successfully', async () => {
        const assetId = 1;
        const updateData = { equipment_name: 'Updated Equipment' };
        const mockResponse = { data: { id: assetId, ...updateData } };
        mockedAxios.put.mockResolvedValue(mockResponse);

        const result = await assetsAPI.updateAsset(assetId, updateData);

        expect(mockedAxios.put).toHaveBeenCalledWith(`/api/assets/${assetId}`, updateData);
        expect(result).toEqual(mockResponse.data);
      });
    });

    describe('deleteAsset', () => {
      it('should delete asset successfully', async () => {
        const assetId = 1;
        mockedAxios.delete.mockResolvedValue({ data: { success: true } });

        const result = await assetsAPI.deleteAsset(assetId);

        expect(mockedAxios.delete).toHaveBeenCalledWith(`/api/assets/${assetId}`);
        expect(result).toEqual({ success: true });
      });
    });

    describe('getLocations', () => {
      it('should fetch locations successfully', async () => {
        const mockLocations = [
          { id: 1, name: 'Mumbai - Andheri' },
          { id: 2, name: 'Delhi - CP' }
        ];
        mockedAxios.get.mockResolvedValue({ data: mockLocations });

        const result = await assetsAPI.getLocations();

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/locations');
        expect(result).toEqual(mockLocations);
      });
    });

    describe('getCategories', () => {
      it('should fetch categories successfully', async () => {
        const mockCategories = [
          { id: 1, name: 'HVAC' },
          { id: 2, name: 'Electrical' }
        ];
        mockedAxios.get.mockResolvedValue({ data: mockCategories });

        const result = await assetsAPI.getCategories();

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/categories');
        expect(result).toEqual(mockCategories);
      });
    });
  });

  describe('maintenanceAPI', () => {
    describe('getSchedules', () => {
      it('should fetch maintenance schedules successfully', async () => {
        const mockSchedules = [
          { id: 1, maintenance_name: 'Monthly Check', frequency: 'Monthly' }
        ];
        mockedAxios.get.mockResolvedValue({ data: mockSchedules });

        const result = await maintenanceAPI.getSchedules();

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/maintenance/schedules');
        expect(result).toEqual(mockSchedules);
      });

      it('should pass filter parameters', async () => {
        const filters = { location: 'Mumbai', category: 'HVAC' };
        mockedAxios.get.mockResolvedValue({ data: [] });

        await maintenanceAPI.getSchedules(filters);

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/maintenance/schedules', { params: filters });
      });
    });

    describe('createSchedule', () => {
      it('should create maintenance schedule successfully', async () => {
        const scheduleData = {
          asset_id: 1,
          maintenance_name: 'Weekly Check',
          start_date: '2024-01-01',
          frequency: 'Weekly'
        };
        const mockResponse = { data: { id: 1, ...scheduleData } };
        mockedAxios.post.mockResolvedValue(mockResponse);

        const result = await maintenanceAPI.createSchedule(scheduleData);

        expect(mockedAxios.post).toHaveBeenCalledWith('/api/maintenance/schedules', scheduleData);
        expect(result).toEqual(mockResponse.data);
      });
    });

    describe('getExternalTasks', () => {
      it('should fetch external PPM tasks successfully', async () => {
        const mockTasks = {
          tasks: [{ id: 1, task_name: 'Test Task' }],
          total: 1,
          kpis: { total: 100, open: 25 }
        };
        mockedAxios.get.mockResolvedValue({ data: mockTasks });

        const result = await maintenanceAPI.getExternalTasks();

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/maintenance/external-tasks');
        expect(result).toEqual(mockTasks);
      });
    });

    describe('generatePPMTasks', () => {
      it('should generate PPM tasks successfully', async () => {
        const mockResponse = { data: { message: 'Tasks generated successfully', count: 5 } };
        mockedAxios.post.mockResolvedValue(mockResponse);

        const result = await maintenanceAPI.generatePPMTasks();

        expect(mockedAxios.post).toHaveBeenCalledWith('/api/maintenance/auto-generate-tasks');
        expect(result).toEqual(mockResponse.data);
      });
    });
  });

  describe('amcRenewalAPI', () => {
    describe('getExternalTickets', () => {
      it('should fetch AMC renewal tickets successfully', async () => {
        const mockTickets = {
          tickets: [{ id: 1, ticket_number: 'AMC001' }],
          total: 1,
          kpis: { total: 50, open: 10 }
        };
        mockedAxios.get.mockResolvedValue({ data: mockTickets });

        const result = await amcRenewalAPI.getExternalTickets();

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/amc-renewal/external-tickets');
        expect(result).toEqual(mockTickets);
      });

      it('should pass filter parameters', async () => {
        const filters = { status: 'Open', location: 'Mumbai' };
        mockedAxios.get.mockResolvedValue({ data: { tickets: [], total: 0 } });

        await amcRenewalAPI.getExternalTickets(filters);

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/amc-renewal/external-tickets', { params: filters });
      });
    });

    describe('getKPIs', () => {
      it('should fetch AMC renewal KPIs successfully', async () => {
        const mockKPIs = { total: 100, open: 25, critical: 5, pastDue: 3, closed: 67 };
        mockedAxios.get.mockResolvedValue({ data: mockKPIs });

        const result = await amcRenewalAPI.getKPIs();

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/amc-renewal/kpis');
        expect(result).toEqual(mockKPIs);
      });
    });

    describe('createTicket', () => {
      it('should create AMC renewal ticket successfully', async () => {
        const ticketData = { asset_id: 1, expiry_date: '2024-12-31' };
        const mockResponse = { data: { id: 1, ticket_number: 'AMC001' } };
        mockedAxios.post.mockResolvedValue(mockResponse);

        const result = await amcRenewalAPI.createTicket(ticketData);

        expect(mockedAxios.post).toHaveBeenCalledWith('/api/amc-renewal/create-ticket', ticketData);
        expect(result).toEqual(mockResponse.data);
      });
    });

    describe('autoGenerate', () => {
      it('should auto-generate AMC renewal tickets successfully', async () => {
        const mockResponse = { data: { created: 5, skipped: 2 } };
        mockedAxios.post.mockResolvedValue(mockResponse);

        const result = await amcRenewalAPI.autoGenerate();

        expect(mockedAxios.post).toHaveBeenCalledWith('/api/amc-renewal/auto-generate');
        expect(result).toEqual(mockResponse.data);
      });
    });
  });

  describe('repairsAPI', () => {
    describe('getRepairs', () => {
      it('should fetch repairs successfully', async () => {
        const mockRepairs = {
          repairs: [{ id: 1, ticket_number: 'REP001' }],
          total: 1,
          kpis: { total: 75, open: 20 }
        };
        mockedAxios.get.mockResolvedValue({ data: mockRepairs });

        const result = await repairsAPI.getRepairs();

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/repairs');
        expect(result).toEqual(mockRepairs);
      });
    });

    describe('getKPIs', () => {
      it('should fetch repair KPIs successfully', async () => {
        const mockKPIs = { total: 75, open: 20, critical: 8, pastDue: 5, closed: 42 };
        mockedAxios.get.mockResolvedValue({ data: mockKPIs });

        const result = await repairsAPI.getKPIs();

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/repairs/kpis');
        expect(result).toEqual(mockKPIs);
      });
    });
  });

  describe('dashboardAPI', () => {
    describe('getKPIs', () => {
      it('should fetch dashboard KPIs successfully', async () => {
        const mockKPIs = {
          totalAssets: 2847,
          activeRepairs: 23,
          ppmCompliance: 94.2,
          amcCoverage: 78.5
        };
        mockedAxios.get.mockResolvedValue({ data: mockKPIs });

        const result = await dashboardAPI.getKPIs();

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/dashboard/kpis');
        expect(result).toEqual(mockKPIs);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network Error');
      networkError.code = 'NETWORK_ERROR';
      mockedAxios.get.mockRejectedValue(networkError);

      await expect(assetsAPI.getAssets()).rejects.toThrow('Network Error');
    });

    it('should handle 404 errors', async () => {
      const notFoundError = {
        response: {
          status: 404,
          data: { message: 'Asset not found' }
        }
      };
      mockedAxios.get.mockRejectedValue(notFoundError);

      await expect(assetsAPI.getAssetById(999)).rejects.toEqual(notFoundError);
    });

    it('should handle 500 errors', async () => {
      const serverError = {
        response: {
          status: 500,
          data: { message: 'Internal Server Error' }
        }
      };
      mockedAxios.get.mockRejectedValue(serverError);

      await expect(assetsAPI.getAssets()).rejects.toEqual(serverError);
    });
  });
});
