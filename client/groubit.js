export class Groubit {
    constructor(data) {
        // This is not ideal, but we need groubits to be able to be
        // serialized in order to be transmitted and still be able to
        // maintain the same information. This is to simulate grouits
        // in a groubit channel, we're not using an actual physical
        // groubit channel.
        if (data) {
            this.al = data.al;
            this.ai = data.ai;
            return;
        }
        this.al = Math.round(Math.random());
        this.ai = 0;
    }

    swap() {
        [this.al, this.ai] = [this.ai, this.al];
    }

    read() {
        return this.al;
    }

    iread() {
        return this.ai;
    }

    write(b) {
        this.al = b;
        this.ai = Math.round(Math.random());
    }

    iwrite(b) {
        this.al = Math.round(Math.random());
        this.ai = b;
    }
}
