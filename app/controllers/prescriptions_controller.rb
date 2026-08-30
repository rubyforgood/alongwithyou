class PrescriptionsController < ApplicationController
  before_action :set_prescription, only: %i[ show edit update destroy ]

  # GET /prescriptions or /prescriptions.json
  def index
    # The index reads as a log: what is being taken now, newest first, with the
    # stopped ones below it as history. includes avoids a medication and a form
    # query per row.
    @prescriptions = Prescription.includes(:medication, :medication_form)
                                 .order(active: :desc, start_date: :desc, created_at: :desc)
  end

  # GET /prescriptions/1 or /prescriptions/1.json
  def show
  end

  # GET /prescriptions/new
  def new
    @prescription = Prescription.new
  end

  # GET /prescriptions/1/edit
  def edit
  end

  # POST /prescriptions or /prescriptions.json
  def create
    @prescription = Prescription.new(prescription_params)

    respond_to do |format|
      if @prescription.save
        format.html { redirect_to @prescription, notice: "Prescription was successfully created." }
        format.json { render :show, status: :created, location: @prescription }
      else
        format.html { render :new, status: :unprocessable_content }
        format.json { render json: @prescription.errors, status: :unprocessable_content }
      end
    end
  end

  # PATCH/PUT /prescriptions/1 or /prescriptions/1.json
  def update
    respond_to do |format|
      if @prescription.update(prescription_params)
        format.html { redirect_to @prescription, notice: "Prescription was successfully updated.", status: :see_other }
        format.json { render :show, status: :ok, location: @prescription }
      else
        format.html { render :edit, status: :unprocessable_content }
        format.json { render json: @prescription.errors, status: :unprocessable_content }
      end
    end
  end

  # DELETE /prescriptions/1 or /prescriptions/1.json
  def destroy
    @prescription.destroy!

    respond_to do |format|
      format.html { redirect_to prescriptions_path, notice: "Prescription was successfully destroyed.", status: :see_other }
      format.json { head :no_content }
    end
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_prescription
      @prescription = Prescription.find(params.expect(:id))
    end

    # Only allow a list of trusted parameters through.
    def prescription_params
      params.expect(prescription: [ :medication_id, :medication_form_id, :dosage, :frequency, :time_of_day, :prescribing_doctor, :purpose, :active, :start_date, :stop_date, :notes ])
    end
end
