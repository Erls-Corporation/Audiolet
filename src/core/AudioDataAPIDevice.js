/**
 * @depends AbstractAudioletDevice.js
 */

var AudioDataAPIDevice = new Class({
    Extends: AbstractAudioletDevice,
    initialize: function(audiolet) {
        AbstractAudioletDevice.prototype.initialize.apply(this, [audiolet]);
        this.output = new Audio();
        this.overflow = null;
        this.writePosition = 0;

        this.output.mozSetup(this.numberOfChannels, this.sampleRate);
        
        this.started = new Date().valueOf();
        this.autoLatency = true;
        this.bufferSize = this.sampleRate * 0.02;
        this.interval = this.tick.periodical(10, this);
    },

    tick: function() {
        var outputPosition = this.output.mozCurrentSampleOffset();
        // Check if some data was not written in previous attempts
        var numSamplesWritten;
        if (this.overflow) {
            numSamplesWritten = this.output.mozWriteAudio(this.overflow);
            this.writePosition += numSamplesWritten;
            if (numSamplesWritten < this.overflow.length) {
                // Not all the data was written, saving the tail for writing
                // the next time fillBuffer is called
                this.overflow = this.overflow.subarray(numSamplesWritten);
                return;
            }
            this.overflow = null;
        }

        var samplesNeeded = outputPosition +
                            (this.bufferSize * this.numberOfChannels) -
                            this.writePosition;

        if (this.autoLatency) {
            var delta = (new Date().valueOf() - this.started) / 1000;
            this.bufferSize = this.sampleRate * delta;
            if (outputPosition) {
                this.autoLatency = false;
            }
        }

        if (samplesNeeded >= this.numberOfChannels) {
            // Samples needed per channel
            samplesNeeded = Math.floor(samplesNeeded / this.numberOfChannels);
            // Request some sound data from the callback function.
            AudioletNode.prototype.tick.apply(this, [samplesNeeded,
                                                     this.getWriteTime()]);
            this.buffer.interleave();
            var buffer = this.buffer.data;

            // Writing the data.
            numSamplesWritten = this.output.mozWriteAudio(buffer);
            this.writePosition += numSamplesWritten;
            if (numSamplesWritten < buffer.length) {
                // Not all the data was written, saving the tail.
                this.overflow = buffer.subarray(numSamplesWritten);
            }
        }
    },

    getPlaybackTime: function() {
        return this.output.mozCurrentSampleOffset() / this.numberOfChannels;
    },

    getWriteTime: function() {
        return this.writePosition / this.numberOfChannels;
    }
});
