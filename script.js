'use strict';


// -------------------------------------------------------------------------------------------------------------------------------------------

// USING GEO LOCATION API


// let map, eventMap; // ---> Making both of them private

class Workout{
    date = new Date();
    id = (Date.now() +'').slice(-10);

    constructor(coords,distance,duration){
        this.coords = coords; // [latitude,longitude]
        this.distance = distance; // in km
        this.duration = duration;// in min
    }

    _setDescription(){
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }
}

class Running extends Workout{

    type = 'running';

    constructor(coords,distance,duration,cadence){
        super(coords,distance,duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }

    calcPace(){
        this.pace = this.duration/this.distance;
        return this.pace;
    }
};
class Cycling extends Workout{

    type = 'cycling';

    constructor(coords,distance,duration,eleveationGain){
        super(coords,distance,duration);
        this.eleveationGain = eleveationGain;
        this.calcSpeed();
        this._setDescription();
    }

    calcSpeed(){
        this.speed = this.distance/(this.duration/60);
        return this.speed;
    }
};

// const run1 = new Running([39,-12],5.2,24,178);
// const cycling1 = new Cycling([39,-12],27,95,523);
// console.log(run1);
// console.log(cycling1);

// ////////////////////////////////////////////////////////////////////////////////

// APPLICATION ARCHITECTURE

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

class App{

    #map;
    #mapZoomLevel = 13;
    #eventMap;
    #workouts = [];

    constructor(){ // ---> CONSTRUCTOR METHODS GETS AUTOMATICALLY CALLED WHEN SCRIPT LOADS
        // GET USERS POSITION
        this._getPosition();

        // GET DTAT FROM LOCAL STORAGE
        this._getLocalStorage();


        // ADD EVENT LISTENER ON FORM
        // "newWorkout" IS AN EVENT HANDLER FUNCTION, SO THE "THIS" KEYWORD FOR THIS EVENT HANDLER FUNCTION POINTS TO THE DOM ELEMENT
        // ON WHICH IT IS ATTACHED, HERE IT IS "form", SO WE USE "BIND() METHOD"
        form.addEventListener('submit',this._newWorkout.bind(this));
        // CHANGE FROM RUNNING TO CYCLYING AND VICE VERSA 
        inputType.addEventListener('change',this._toggleElevationField);
        // MOVE THE MAP TO MARKER WHOSE WORKOUT DETAILS WERE CLICKED
        containerWorkouts.addEventListener('click',this._moveToPopup.bind(this));



    };

    // getCurrentPosition() takes 2 callback funnction, first callback function will be called on success,
    // whenever the browser got current position of the user, the second function will be called
    // when we get error while getting the coordinates

    // The first callback function called in case of success has one parameter called "Position Parameter"

    _getPosition(){
        if(navigator.geolocation){
            navigator.geolocation.getCurrentPosition(this._loadMap.bind(this),function(){
                // "this._loadMap" is a regular function call so the "THIS KEYWORD" is undefined,
                // HENCE WE USE "bind.this" method to point to the current object "app" IN THIS CASE

                alert('Could not get position')
            });
        }
    }

    _loadMap(position){
        // GET OUR COORDINATES
        // console.log(position); // GeolocationPosition {coords: GeolocationCoordinates, timestamp: 1647249293102}

        // Using Object destructuring
        const {latitude} = position.coords;
        const {longitude} = position.coords;
        // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);


        // Using our own latitude and longitude in L.map('map).setView([latitude,longitude],13)
        const coords = [latitude,longitude];
        

        // DISPLAY OUR COORDINATES ON MAP ******************************************************************************

        // String that we pass inside the function "L.map('string')" must be the id name of an element in HTML and in that element MAP will be displayed
        // "setView" function has 2 parameters, firts is "coords" displaying latitude and longitude
        // second is the "zoom level" ---> setView(coords,zoom level)
        this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
        // console.log(map); // --> MAP IS AN OBJECT GENERATED BY LEAFLET


        // map that we see on page is made of tiles having URL as seen below
        // L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { // ---> DEFAULT STYLE

        L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', { // ---> NEW STYLE
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);




        // IF WE HAD EVENT LISTENER ON THE ENTIRE MAP, THEN WE WOULD HAVE NO WAY OF KNOWING
        // WHERE EXACTLT THE USER CLICKED ON THE MAP
        
        // Adding a function similar to "Event listener" to listen from clicks on map and add markers
        // The "on()" method is coming from " Leaflet library"
        this.#map.on('click',this._showForm.bind(this));
        
        // STORAGE OF MAP MARKERS WHEN LOADING PAGE
        this.#workouts.forEach(work=>this._renderWorkoutMarker(work));
    }

    _showForm(eventM){
        this.#eventMap = eventM;
        // console.log(eventMap); // ---> {originalEvent: PointerEvent, containerPoint: k, layerPoint: k, latlng: D, type: 'click', …}

        // DISPLAY WORKOUT FORM WHEN A MAP IS CLICKED
        form.classList.remove('hidden');
        inputDistance.focus();
    }

    _hideForm(){
        inputDistance.value = inputCadence.value = inputDuration.value = inputElevation.value = '';
        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(()=>form.style.display = 'grid',1000)

    };

    _toggleElevationField(){
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkout(e){

        const validInputs = (...inputs) => inputs.every(inp=> Number.isFinite(inp));
        

        const allPositive = (...inputs) => inputs.every(inp => inp > 0);
        

        e.preventDefault();


        // Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const {lat,lng} = this.#eventMap.latlng;
        let workout;

        
        // If workout running, create running object
        if(type === 'running'){
            const cadence = +inputCadence.value;
            // Check if data is valid
            if(
                // !Number.isFinite(distance) || 
                // !Number.isFinite(duration) || 
                // !Number.isFinite(cadence)
                !validInputs(distance,duration,cadence) || 
                !allPositive(distance,duration,cadence)
                ){console.log(!allPositive(distance,duration,cadence),!validInputs(distance,duration,cadence));
                    return alert('Inputs have to be positive numbers')}  
            
            workout = new Running([lat,lng],distance,duration,cadence);
            
        }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
        const elevation = +inputElevation.value;

        if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
        )
            return alert('Inputs have to be positive numbers!');

        workout = new Cycling([lat, lng], distance, duration, elevation);
  }

        // Add new object to workout array
        this.#workouts.push(workout);
    
        
        // Render workout on map as a marker
        this._renderWorkoutMarker(workout);

        // Render workout on list
        this._renderWorkout(workout);

        // Hide form + clear input field
        this._hideForm();

        // SET LOCAL STORAGE TO ALL WORKOUTS
        this._setLocalStorage();

        
    }

    _renderWorkoutMarker(workout){
        // ADDING A MARKER IN OUR MAP LECTURE 234 ***************************************************************************************
        L.marker(workout.coords).addTo(this.#map)
        .bindPopup(L.popup({
            maxWidth:250, // MAX WIDTH OF POPUP
            minWidth:100, // MIN WIDTH OF POPUP
            autoClose:false, // POP UP WILL NOT CLOSE WHEN ANOTHER POPUP IS PRESENT
            closeOnClick:false,
            className:`${workout.type}-popup`,
        })
        )
        .setPopupContent(`${workout.type === 'running' ?'🏃‍♂️' : '🚴‍♀️'} ${workout.description}`) // Always needs to be a string
        .openPopup();
    }

    _renderWorkout(workout){
        let html = `
            <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${workout.description}</h2>
            <div class="workout__details">
                <span class="workout__icon">${workout.type === 'running' ?'🏃‍♂️' : '🚴‍♀️'}</span>
                <span class="workout__value">${workout.distance}</span>
                <span class="workout__unit">km</span>
            </div>
            <div class="workout__details">
                <span class="workout__icon">⏱</span>
                <span class="workout__value">24</span>
                <span class="workout__unit">min</span>
            </div>
        `;

        if(workout.type === 'running'){
            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.pace.toFixed(1)}</span>
                    <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">🦶🏼</span>
                    <span class="workout__value">${workout.cadence}</span>
                    <span class="workout__unit">spm</span>
                </div>
            </li>
                `;
        };

        if(workout.type==='cycling'){
            html+= `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.speed.toFixed(1)}</span>
                    <span class="workout__unit">km/h</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⛰</span>
                    <span class="workout__value">${workout.eleveationGain}</span>
                    <span class="workout__unit">m</span>
                </div>
            </li>
            `;
        }

        // ADD NEW ELEMENT AS SIBLING ELEMENT
        form.insertAdjacentHTML('afterend',html);
    }


    // MOVE TO MARKER ON CLICK
    _moveToPopup(e){
        const workoutEl = e.target.closest('.workout');

        if(!workoutEl) return;

        const workout = this.#workouts.find(work=>work.id ===workoutEl.dataset.id);
        console.log(workout)

        // TAKE COORDINATES AND MOVE THE MAP TO A SPECIFIC LOCATION USING LEAFLET METHOD
        this.#map.setView(workout.coords,this.#mapZoomLevel,{
            animate:true,
            pan:{
                duration:1,
            }
        })

    }

    // TO CONVERT OBJECTS INTO STRINGS USE "JSON.stringify(this.propertyName)"

    // LOCAL STORAGE API SHOULD BE USED FOR SMALL AMOUNTS OF DATA

    // SHOW DATA BACK ON MAP ONCE WE RELOAD THE PAGE

    // STORING WORKOUT DEATILS USING "LOCAL STORAGE API"
    _setLocalStorage(){
        // Second parameter is the string we want to store and first parameter is its name
        // Basically a "key-value" pair
        localStorage.setItem('workouts',JSON.stringify(this.#workouts))
    }

    _getLocalStorage(){
        // PASS IN THE KEY OF OUR LOCAL STORAGE ITEM
        const data = JSON.parse(localStorage.getItem('workouts')); // --> RETURNS A STRING, USE "JSON.parse()"
        // TO CONVERT IT INTO OBJECT

        if(!data) return;

        // RESTORING WORKOUTS ARRAY
        this.#workouts = data;

        // RENDERING WORKOUTS
        this.#workouts.forEach(work=>this._renderWorkout(work))
    }

    // DELETE DATA FROM LOCAL STORAGE
    reset(){
        localStorage.removeItem('workouts');

        // RELOAD PAGE PROGRAMATICALLY
        location.reload(); // LOCATION IS A BIG OBJECT CONTAINING A LOT OF METHODS
    }

}


const app = new App();




// -------------------------------------------------------------------------------------------------------------------------------------------


