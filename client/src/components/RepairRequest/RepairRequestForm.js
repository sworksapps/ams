import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import './RepairRequestForm.css';

const RepairRequestForm = ({ onClose }) => {
  const navigate = useNavigate();
  
  // Form state
  const [step, setStep] = useState(1); // 1: Title & Type, 2: Asset Selection (if asset-based), 3: Form Details
  const [formData, setFormData] = useState({
    title: '',
    isAssetBased: null, // null = not selected, true = asset-based, false = non-asset-based
    location: '',
    assetId: '',
    category: 'Repair & Maintenance request', // Default category
    subCategory: '',
    vendorName: '',
    amount: '',
    priority: 'Medium', // Default priority
    nature: '',
    description: '',
    chargeableToClients: 'No', // Default to No
    attachments: []
  });
  
  // Options data
  const [locations, setLocations] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  
  // Form validation
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock data - replace with actual API calls
  useEffect(() => {
    // Load locations
    setLocations([
      { id: 1, name: 'Mumbai - Andheri' },
      { id: 2, name: 'Delhi - Connaught Place' },
      { id: 3, name: 'Bangalore - Whitefield' },
      { id: 4, name: 'Chennai - OMR' },
      { id: 5, name: 'Hyderabad - Gachibowli' }
    ]);
  }, []);

  // Load assets when location changes
  useEffect(() => {
    if (formData.location && formData.isAssetBased) {
      setLoadingAssets(true);
      // Mock API call - replace with actual API
      setTimeout(() => {
        setAssets([
          { id: 1, name: 'HVAC Unit - Floor 1', category: 'HVAC Systems', code: 'HVAC001' },
          { id: 2, name: 'Generator - Backup Power', category: 'Electrical', code: 'GEN001' },
          { id: 3, name: 'Water Pump - Main', category: 'Plumbing', code: 'PUMP001' },
          { id: 4, name: 'Elevator - Main', category: 'Mechanical', code: 'ELEV001' },
          { id: 5, name: 'Fire Alarm Panel', category: 'Safety', code: 'FIRE001' }
        ]);
        setLoadingAssets(false);
      }, 1000);
    }
  }, [formData.location, formData.isAssetBased]);

  // Auto-fill category when asset is selected
  useEffect(() => {
    if (formData.assetId && assets.length > 0) {
      const selectedAsset = assets.find(asset => asset.id.toString() === formData.assetId);
      if (selectedAsset) {
        setFormData(prev => ({ ...prev, category: selectedAsset.category }));
      }
    }
  }, [formData.assetId, assets]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const newAttachments = files.map(file => ({
      id: Date.now() + Math.random(),
      file,
      name: file.name,
      size: file.size
    }));
    
    setFormData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...newAttachments]
    }));
  };

  const removeAttachment = (attachmentId) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter(att => att.id !== attachmentId)
    }));
  };

  const validateStep = (currentStep) => {
    const newErrors = {};

    if (currentStep === 1) {
      if (!formData.title.trim()) {
        newErrors.title = 'Title is required';
      }
      if (formData.isAssetBased === null) {
        newErrors.isAssetBased = 'Please select repair type';
      }
    }

    if (currentStep === 2 && formData.isAssetBased) {
      if (!formData.location) {
        newErrors.location = 'Location is required';
      }
      if (!formData.assetId) {
        newErrors.assetId = 'Asset selection is required';
      }
    }

    if (currentStep === 3) {
      if (!formData.subCategory) {
        newErrors.subCategory = 'Sub-category is required';
      }
      if (!formData.vendorName.trim()) {
        newErrors.vendorName = 'Vendor name is required';
      }
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        newErrors.amount = 'Valid amount is required';
      }
      if (!formData.nature) {
        newErrors.nature = 'Nature is required';
      }
      if (!formData.description.trim()) {
        newErrors.description = 'Description is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      if (step === 1 && !formData.isAssetBased) {
        // Skip asset selection for non-asset-based repairs
        setStep(3);
      } else {
        setStep(step + 1);
      }
    }
  };

  const handleBack = () => {
    if (step === 3 && !formData.isAssetBased) {
      // Skip asset selection for non-asset-based repairs
      setStep(1);
    } else {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setIsSubmitting(true);
    try {
      // Mock API call - replace with actual submission
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Success - redirect to repairs list
      navigate('/repairs', { 
        state: { 
          message: 'Repair request submitted successfully!',
          type: 'success'
        }
      });
    } catch (error) {
      console.error('Error submitting repair request:', error);
      setErrors({ submit: 'Failed to submit repair request. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => {
    const totalSteps = formData.isAssetBased ? 3 : 2;
    const currentStepNumber = formData.isAssetBased ? step : (step === 3 ? 2 : step);
    
    return (
      <div className="repair-request-step-indicator">
        <div className="repair-request-steps">
          <div className={`repair-request-step ${step >= 1 ? 'active' : ''}`}>
            <div className="repair-request-step-number">1</div>
            <span>Basic Info</span>
          </div>
          {formData.isAssetBased && (
            <div className={`repair-request-step ${step >= 2 ? 'active' : ''}`}>
              <div className="repair-request-step-number">2</div>
              <span>Asset Selection</span>
            </div>
          )}
          <div className={`repair-request-step ${step >= 3 ? 'active' : ''}`}>
            <div className="repair-request-step-number">{formData.isAssetBased ? '3' : '2'}</div>
            <span>Details</span>
          </div>
        </div>
      </div>
    );
  };

  const renderStep1 = () => (
    <div className="repair-request-step-content">
      <h3>Basic Information</h3>
      
      <div className="repair-request-form-group">
        <label className="repair-request-label required">
          Title <span className="repair-request-required">*</span>
        </label>
        <input
          type="text"
          className={`repair-request-input ${errors.title ? 'error' : ''}`}
          value={formData.title}
          onChange={(e) => handleInputChange('title', e.target.value)}
          placeholder="Enter repair request title"
        />
        {errors.title && <span className="repair-request-error">{errors.title}</span>}
      </div>

      <div className="repair-request-form-group">
        <label className="repair-request-label required">
          Repair Type <span className="repair-request-required">*</span>
        </label>
        <div className="repair-request-radio-group">
          <label className="repair-request-radio-option">
            <input
              type="radio"
              name="repairType"
              checked={formData.isAssetBased === true}
              onChange={() => handleInputChange('isAssetBased', true)}
            />
            <span>Asset-based Repair</span>
            <small>Repair related to a specific asset</small>
          </label>
          <label className="repair-request-radio-option">
            <input
              type="radio"
              name="repairType"
              checked={formData.isAssetBased === false}
              onChange={() => handleInputChange('isAssetBased', false)}
            />
            <span>Non-asset Repair</span>
            <small>General repair not tied to specific asset</small>
          </label>
        </div>
        {errors.isAssetBased && <span className="repair-request-error">{errors.isAssetBased}</span>}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="repair-request-step-content">
      <h3>Asset Selection</h3>
      
      <div className="repair-request-form-group">
        <label className="repair-request-label required">
          Location <span className="repair-request-required">*</span>
        </label>
        <select
          className={`repair-request-select ${errors.location ? 'error' : ''}`}
          value={formData.location}
          onChange={(e) => handleInputChange('location', e.target.value)}
        >
          <option value="">Select Location</option>
          {locations.map(location => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
        {errors.location && <span className="repair-request-error">{errors.location}</span>}
      </div>

      {formData.location && (
        <div className="repair-request-form-group">
          <label className="repair-request-label required">
            Asset <span className="repair-request-required">*</span>
          </label>
          {loadingAssets ? (
            <div className="repair-request-loading">Loading assets...</div>
          ) : (
            <select
              className={`repair-request-select ${errors.assetId ? 'error' : ''}`}
              value={formData.assetId}
              onChange={(e) => handleInputChange('assetId', e.target.value)}
            >
              <option value="">Select Asset</option>
              {assets.map(asset => (
                <option key={asset.id} value={asset.id}>
                  {asset.name} ({asset.code})
                </option>
              ))}
            </select>
          )}
          {errors.assetId && <span className="repair-request-error">{errors.assetId}</span>}
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="repair-request-step-content">
      <h3>Repair Details</h3>
      
      <div className="repair-request-form-row">
        <div className="repair-request-form-group">
          <label className="repair-request-label">Category</label>
          <input
            type="text"
            className="repair-request-input"
            value={formData.category}
            disabled
          />
        </div>

        <div className="repair-request-form-group">
          <label className="repair-request-label required">
            Sub-Category <span className="repair-request-required">*</span>
          </label>
          <select
            className={`repair-request-select ${errors.subCategory ? 'error' : ''}`}
            value={formData.subCategory}
            onChange={(e) => handleInputChange('subCategory', e.target.value)}
          >
            <option value="">Select Sub-Category</option>
            <option value="AMC">AMC</option>
            <option value="Capex">Capex</option>
            <option value="Civil">Civil</option>
            <option value="Compliance">Compliance</option>
            <option value="Electrical">Electrical</option>
            <option value="FAPA">FAPA</option>
            <option value="Furnitures & Fixtures">Furnitures & Fixtures</option>
            <option value="HVAC">HVAC</option>
            <option value="Others">Others</option>
            <option value="UPS">UPS</option>
          </select>
          {errors.subCategory && <span className="repair-request-error">{errors.subCategory}</span>}
        </div>
      </div>

      <div className="repair-request-form-row">
        <div className="repair-request-form-group">
          <label className="repair-request-label required">
            Vendor Name <span className="repair-request-required">*</span>
          </label>
          <input
            type="text"
            className={`repair-request-input ${errors.vendorName ? 'error' : ''}`}
            value={formData.vendorName}
            onChange={(e) => handleInputChange('vendorName', e.target.value)}
            placeholder="Enter vendor name"
          />
          {errors.vendorName && <span className="repair-request-error">{errors.vendorName}</span>}
        </div>

        <div className="repair-request-form-group">
          <label className="repair-request-label required">
            Amount <span className="repair-request-required">*</span>
          </label>
          <input
            type="number"
            className={`repair-request-input ${errors.amount ? 'error' : ''}`}
            value={formData.amount}
            onChange={(e) => handleInputChange('amount', e.target.value)}
            placeholder="Enter amount"
            min="0"
            step="0.01"
          />
          {errors.amount && <span className="repair-request-error">{errors.amount}</span>}
        </div>
      </div>

      <div className="repair-request-form-row">
        <div className="repair-request-form-group">
          <label className="repair-request-label">Priority</label>
          <select
            className="repair-request-select"
            value={formData.priority}
            onChange={(e) => handleInputChange('priority', e.target.value)}
          >
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <div className="repair-request-form-group">
          <label className="repair-request-label required">
            Nature <span className="repair-request-required">*</span>
          </label>
          <select
            className={`repair-request-select ${errors.nature ? 'error' : ''}`}
            value={formData.nature}
            onChange={(e) => handleInputChange('nature', e.target.value)}
          >
            <option value="">Select Nature</option>
            <option value="Capex">Capex</option>
            <option value="Opex">Opex</option>
          </select>
          {errors.nature && <span className="repair-request-error">{errors.nature}</span>}
        </div>
      </div>

      <div className="repair-request-form-group">
        <label className="repair-request-label required">
          Description <span className="repair-request-required">*</span>
        </label>
        <textarea
          className={`repair-request-textarea ${errors.description ? 'error' : ''}`}
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Describe the repair requirement in detail"
          rows="4"
        />
        {errors.description && <span className="repair-request-error">{errors.description}</span>}
      </div>

      <div className="repair-request-form-group">
        <label className="repair-request-label required">
          Chargeable to clients <span className="repair-request-required">*</span>
        </label>
        <select
          className="repair-request-select"
          value={formData.chargeableToClients}
          onChange={(e) => handleInputChange('chargeableToClients', e.target.value)}
        >
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </div>

      <div className="repair-request-form-group">
        <label className="repair-request-label">
          Attachments <span className="repair-request-required">*</span>
        </label>
        <div className="repair-request-file-upload">
          <input
            type="file"
            id="file-upload"
            multiple
            onChange={handleFileUpload}
            className="repair-request-file-input"
          />
          <label htmlFor="file-upload" className="repair-request-file-label">
            <Upload size={20} />
            Upload Files
          </label>
        </div>
        
        {formData.attachments.length > 0 && (
          <div className="repair-request-attachments">
            {formData.attachments.map(attachment => (
              <div key={attachment.id} className="repair-request-attachment">
                <span className="repair-request-attachment-name">{attachment.name}</span>
                <span className="repair-request-attachment-size">
                  ({(attachment.size / 1024).toFixed(1)} KB)
                </span>
                <button
                  type="button"
                  onClick={() => removeAttachment(attachment.id)}
                  className="repair-request-attachment-remove"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="repair-request-overlay">
      <div className="repair-request-modal">
        <div className="repair-request-header">
          <div className="repair-request-header-left">
            <button 
              onClick={onClose}
              className="repair-request-back-btn"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2>Repair & Maintenance Request</h2>
              <p>Create a new repair request</p>
            </div>
          </div>
        </div>

        {renderStepIndicator()}

        <div className="repair-request-content">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>

        {errors.submit && (
          <div className="repair-request-submit-error">
            <AlertCircle size={16} />
            {errors.submit}
          </div>
        )}

        <div className="repair-request-footer">
          <div className="repair-request-actions">
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="repair-request-btn repair-request-btn-secondary"
                disabled={isSubmitting}
              >
                Back
              </button>
            )}
            
            {step < (formData.isAssetBased ? 3 : 2) ? (
              <button
                type="button"
                onClick={handleNext}
                className="repair-request-btn repair-request-btn-primary"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="repair-request-btn repair-request-btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="repair-request-spinner" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    Submit Request
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepairRequestForm;
