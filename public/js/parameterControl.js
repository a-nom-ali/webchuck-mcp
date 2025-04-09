// js/parameterControl.js
import * as WebChuckService from './webchuckService.js';
import * as UI from './ui.js';
import * as parameters from "zod/lib/helpers/util.js";

// Parameter control module
const ParameterControl = (function() {
    // Private variables
    let activeParameters = [];
    let isRunning = false;
    
    // Parameter types we can control
    const CONTROLLABLE_TYPES = ['float', 'int', 'dur', 'string'];
    
    // Regex patterns for parameter detection
    const paramPatterns = {
        // Match global variables with comments containing @param
        global: /(\/\/\s*@param\s*.*\n)(\/\/\s*@[range|options]\s*.*\n)\s*(.+)\s*=>\s*global\s*(\w+)\s*(\w+)\s*;/g,
        
        // Match class variables with modifiers
        classVar: /(?:public|private)?\s*([\w]+)\s*(\w+)\s*=\s*([\d.]+)\s*;/g,

        // Match range
        range: /\/\/\s*@range\s+([\d.-]+)\s+([\d.-]+)/g,

        // Match options
        options: /\/\/\s*@options\s+(.+)\n/g,

        // Match parameter
        param: /=>\s*([\w]+)\s*(\w+)\s*;/,
    };
    
    // Extract parameters from code
    function resetextractParameters(code) {
        activeParameters
        // parameters = [];
    };

    // Extract parameters from code
    function extractParameters(code) {
        const parameters = [];

        // Extract global params
        let match;
        while ((match = paramPatterns.global.exec(code)) !== null) {
            const type = match[4];
            if (CONTROLLABLE_TYPES.includes(type)) {
                // @param select different Western soundtrack presets
                // @options lonely_cowboy tumbleweed_town high_noon_showdown campfire_stories saloon_brawl
                // "lonely_cowboy" => global string current_preset;
                if (type === 'string') {
                    const options = match[2].replace("// @options",'').trim().split(" ");
                    const range = {
                        min : 0,
                        max : options.length - 1
                    };
                    parameters.push({
                        type: type,
                        name: match[5],
                        value: options.indexOf(match[3].replaceAll(/['"]+/g,'')),
                        min: range.min, // Default minimum
                        max: range.max, // Default maximum
                        options: options,
                        step: 1, // Step based on type
                        global: true
                    });
                }
                else {
                    const parts = match[2].split(" ");
                    const range = {
                        min : parts[parts.length - 2],
                        max : parts[parts.length - 1]
                    }
                    parameters.push({
                        type: type,
                        name: match[5],
                        value: parseFloat(match[3]),
                        min: type === 'int' ? parseInt(range.min) : parseFloat(range.min), // Default minimum
                        max: type === 'int' ? parseInt(range.max) : parseFloat(range.max), // Default maximum
                        options: null,
                        step: type === 'int' ? 1 : 0.01, // Step based on type
                        global: true
                    });
                }
            }
        }

        // Parse for custom range annotations (e.g., // @range 0 10)
        const lines = code.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let rangeMatch;
            let optionMatch;

            if (
                (rangeMatch = paramPatterns.range.exec(line)) !== null
                ||
                (optionMatch = paramPatterns.options.exec(line)) !== null
            ) {
                // Check if the next line contains a parameter
                if (i + 1 < lines.length) {
                    const nextLine = lines[i + 1];
                    const paramMatch = paramPatterns.param.exec(nextLine);
                    
                    if (paramMatch) {
                        const paramName = paramMatch[2];
                        // Find and update the parameter
                        const param = parameters.find(p => p.name === paramName);
                        if (param) {
                            let min = 0;
                            let max = 1;
                            if (rangeMatch) {
                                min = parseFloat(rangeMatch[1]);
                                max = parseFloat(rangeMatch[2]);
                            }
                            else {
                                min = 0;
                                max = param.options.length - 1;
                            }

                            param.min = min;
                            param.max = max;
                        }
                    }
                }
            }
        }
        
        return parameters;
    }
    
    // Generate UI controls for parameters
    function createControls(parameters) {
        const controlsContainer = document.getElementById('parameter-controls');
        if (!controlsContainer) return;
        
        // Clear existing controls
        controlsContainer.innerHTML = '';
        
        if (parameters.length === 0) {
            controlsContainer.innerHTML = '<div class="no-params">No controllable parameters detected in code.</div>';
            return;
        }
        
        // Create controls for each parameter
        parameters.forEach(param => {
            const controlGroup = document.createElement('div');
            controlGroup.className = 'control-group';
            
            // Parameter label
            const label = document.createElement('label');
            label.className = 'param-label';
            // Split name by capital letters and join with spaces
            const name = param.name.replace(/([A-Z])/g, ' $1').trim();
            label.textContent = `${name.split("_").join(" ")}`; //  (${param.type}):`;
            label.setAttribute('for', `param-${param.name}`);
            
            // Range slider
            const slider = document.createElement('input');
            slider.type = 'range';
            slider.id = `param-${param.name}`;
            slider.className = 'param-slider';
            slider.min = param.min;
            slider.max = param.max;
            slider.step = param.step;
            slider.value = param.value;
            
            // Value display
            const valueDisplay = document.createElement('span');

            if(param.type === 'string') {
                valueDisplay.className = 'param-option';
                const option = param.options[0].replace(/([A-Z])/g, ' $1').trim();
                valueDisplay.textContent = `${option.split("_").join(" ")}`; //  (${param.type}):`;
            }
            else {
                valueDisplay.className = 'param-value';
                valueDisplay.textContent = param.value;
            }

            // Event listener for slider
            slider.addEventListener('input', function() {
                if(param.type === 'string') {
                    const newValue = parseInt(this.value);
                    const option = param.options[newValue].replace(/([A-Z])/g, ' $1').trim();
                    valueDisplay.textContent = `${option.split("_").join(" ")}`; //  (${param.type}):`;
                    updateParameter(param.name, param.type, param.options[newValue]);

                    return;
                }
                const newValue = parseFloat(this.value);
                valueDisplay.textContent = newValue;
                updateParameter(param.name, param.type, newValue);
            });
            
            // Append elements
            controlGroup.appendChild(label);
            controlGroup.appendChild(slider);
            controlGroup.appendChild(valueDisplay);
            controlsContainer.appendChild(controlGroup);
        });
    }
    
    // Update parameter in running ChucK instance
    async function getParameterValue(name) {
        const parameter = parameters.find(p => p.name === name);
        if (parameter)
        {
            switch (type) {
                case 'int':
                    return chuckInstance.getInt(name);
                    break;
                case 'float':
                    return chuckInstance.getFloat(name);
                    break;
                case 'dur':
                    // Handle duration (convert to seconds)
                    return chuckInstance.getFloat(name);
                    break;
                case 'string':
                    // Handle duration (convert to seconds)
                    return chuckInstance.getString(name);
                    break;
                default:
                    console.warn(`Unsupported parameter type: ${type}`);
                    return null;
            }
        }
    }

    // Update parameter in running ChucK instance
    async function updateParameter(name, type, value) {
        if (!isRunning) return;
        
        try {
            // Use WebChucK API to update the parameter
            const chuckInstance = WebChuckService.getChuckInstance();
            if (!chuckInstance) {
                console.error("Cannot update parameter: Chuck instance not available");
                return;
            }
            
            // Use the appropriate method based on parameter type
            switch (type) {
                case 'int':
                    chuckInstance.setInt(name, Math.round(value));
                    break;
                case 'float':
                    chuckInstance.setFloat(name, value);
                    break;
                case 'dur':
                    // Handle duration (convert to seconds)
                    chuckInstance.setFloat(name, value);
                    break;
                case 'string':
                    // Handle duration (convert to seconds)
                    chuckInstance.setString(name, value);
                    break;
                default:
                    console.warn(`Unsupported parameter type: ${type}`);
            }
            
            UI.updateConsole(`Parameter ${name} updated to ${value}`);
        } catch (error) {
            console.error(`Error updating parameter ${name}:`, error);
            UI.updateConsole(`Error updating parameter ${name}: ${error.message}`);
        }
    }
    
    // Public API
    return {
        // Initialize parameter controls from code
        initParameterControl: function(code) {
            extractParameters(code).forEach(param => {
                if (!activeParameters.some(p => p.name === param.name)) {
                    activeParameters.push(param);
                }
            });
            // activeParameters = Array.from(new Set([...activeParameters, ...extractParameters(code)]));
            createControls(activeParameters);
            isRunning = true;
            return activeParameters.length > 0;
        },
        
        // Reset controls when ChucK is stopped
        resetParameterControl: function() {
            isRunning = false;
            const controlsContainer = document.getElementById('parameter-controls');
            if (controlsContainer) {
                controlsContainer.innerHTML = '<div class="no-params">ChucK is not running.</div>';
            }
            activeParameters = [];
        },

        updateParameter : updateParameter,
        getParameterValue : getParameterValue,
        // Get active parameters (for other components)
        getActiveParameters: function() {
            return [...activeParameters];
        }
    };
})();

export default ParameterControl;
