import {Map, InfoWindow, Circle, Marker, GoogleApiWrapper} from 'google-maps-react';
import React from "react";
// Config starter code
import { createChatBotMessage } from "react-chatbot-kit";
import Chatbot from "react-chatbot-kit";
import axios from "axios";


// https://fredrikoseberg.github.io/react-chatbot-kit-docs/ research front end stuff
// MessageParser starter code
class MessageParser {
  constructor(actionProvider, state) {
    this.actionProvider = actionProvider;
    this.state = state;
  }

  parse(message) {
    console.log(message)
  }
}


// ActionProvider starter code
class ActionProvider {
   constructor(
    createChatBotMessage,
    setStateFunc,
    createClientMessage,
    stateRef,
    createCustomMessage,
    ...rest
  ) {
    this.createChatBotMessage = createChatBotMessage;
    this.setState = setStateFunc;
    this.createClientMessage = createClientMessage;
    this.stateRef = stateRef;
    this.createCustomMessage = createCustomMessage;
  }
}



const botName = "Urban Planning Bot";

const config = {
  botName: botName,
  lang: "no",
  customStyles: {
    botMessageBox: {
      backgroundColor: "#376B7E",
    },
    chatButton: {
      backgroundColor: "yellow",
    },
  },
  initialMessages: [
    createChatBotMessage(
      `Hi I'm ${botName}. I’m here to help you explain how I work.`, {
        withAvatar: false,
        delay: 500,
      }
    ),
    createChatBotMessage(
      "Here's a quick overview over what I need to function. ask me about the different parts to dive deeper.",
      {
        withAvatar: false,
        delay: 500,
      }
    ),
  ],
  
  
};




const center = {
  lat: 34.02051,
  lng: -118.28563
}

export class MapContainer extends React.Component {
  state = {
    markerType: null,
    markers: [],
  };

  markerChangeLeisure = (e) => {
    this.setState({
      markerType: "Leisure",
    })
  };

  markerChangeCivic = (e) => {
    this.setState({
      markerType: "Civic"
    })
  };

  markerChangeFood = (e) => {
    this.setState({
      markerType: "Food"
    })
  };

  onMarkerClick = (e) => {
    console.log()
    alert(`Marker Info:
      type: ${e.title}
      lat: ${e.position.lat}
      lng: ${e.position.lng}

    `)

  }  

  removeLastMarker = () => { 
    const newMarkers = this.state.markers
    if ( newMarkers.length == 0 ) {
      return
    } 
    this.setState({ 
      markers: newMarkers.slice(0, -1)

    })

  }
  renderMarkers() {
    console.log("markers", this.state.markers)
    if ( this.state.markers.length == 0) {
      return
    }
    return this.state.markers.map( (marker, i) =>  
    <Marker 
      title={marker.type}
      id={i}
      onClick={this.onMarkerClick}
      position={{lat: marker.lat, lng: marker.lng}} />)
  }

  handleSubmit = (e) => {

    e.preventDefault();

    let form_data = new FormData();
    
    form_data.append('markers', this.state.markers);

    let url = 'INSERT URL HERE';
    axios.post(url, form_data, {
      headers: {
        'content-type': 'multipart/form-data'
      }
    })
        .then(res => {
          this.setState({
            filtered_image: res.data
          })
          alert("Success!\n" + res.data)
          console.log(res.data);
        })
        .catch(err => console.log(err))
  };
  


  onMapClicked = (t, map, coord) => {
    console.log("main", t, map, coord)
    if ( this.state.markerType == null ) {
      alert("No marker type selected")
      return
    }
    const { latLng } = coord;
    const lat = latLng.lat()
    const lng = latLng.lng()
    const newMarkers = this.state.markers
    newMarkers.push({
      type: this.state.markerType, 
      lat,
      lng
    })
    this.setState({
        markers: newMarkers,
    }, ()=>{console.log("jj", this.state.markers)} )
    
  };

  render() {
    return (
      <div style={  {display:'flex',
        flexDirection:'row'}
      }>
        
      <div style={{width:"40vw", height:"100vh"}}>
        <Chatbot
          config={config}
          messageParser={MessageParser}
          actionProvider={ActionProvider}
        />
      </div>
  
        <div style={{  width:"60vw"}}>
          <div>
            Add a marker: 
            <button onClick={this.markerChangeLeisure}>Leisure</button>
            <button onClick={this.markerChangeFood}>Food</button>
            <button onClick={this.markerChangeCivic}>Civic Engagement</button>
          </div>
          <div>
          {this.state.markerType}
          </div>
          <form onSubmit={this.handleSubmit}>
          <input type="submit"/>
          </form>
          <div>
            <button onClick={this.removeLastMarker}> Remove a Marker</button>
          </div>
          <div>
          <Map google={this.props.google} zoom={14}
          initialCenter={center}
          zoom={15}
          style={{width:"70vw"}}
          onClick={this.onMapClicked}      >
            <Marker 
                    name={'Current location'} />
            {this.renderMarkers()}
          </Map>
          </div>
        </div>
    </div>
    );
  }
}

export default GoogleApiWrapper({
  apiKey: ("AIzaSyBYvlWwrf_COwFecR3K2K-Cyx7hK06MXso")
})(MapContainer)
